import json
from datetime import date, datetime
from typing import Optional

from sqlalchemy import inspect, or_, text
from sqlalchemy.orm import Session

from app.db.models.task import Task, TaskHistory, TaskComment
from app.db.models.notification import TaskNotification
from app.db.models.user import User
from app.enums import TaskAction, TaskStatus


_TASK_PASS_COLUMNS_READY = False
_TASK_NOTIFICATION_TABLE_READY = False
_TASK_COMMENT_TABLE_READY = False


def _json_default(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _ensure_task_pass_columns(db: Session) -> None:
    global _TASK_PASS_COLUMNS_READY
    if _TASK_PASS_COLUMNS_READY:
        return

    bind = db.get_bind()
    inspector = inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("tasks")}

    statements: list[str] = []

    if "last_passed_by" not in columns:
        statements.append("ALTER TABLE tasks ADD COLUMN last_passed_by INTEGER")
    if "last_passed_to" not in columns:
        statements.append("ALTER TABLE tasks ADD COLUMN last_passed_to INTEGER")
    if "last_pass_note" not in columns:
        statements.append("ALTER TABLE tasks ADD COLUMN last_pass_note TEXT")
    if "last_passed_at" not in columns:
        statements.append("ALTER TABLE tasks ADD COLUMN last_passed_at TIMESTAMP")

    for statement in statements:
        db.execute(text(statement))

    if statements:
        db.commit()

    _TASK_PASS_COLUMNS_READY = True


def _ensure_task_notification_table(db: Session) -> None:
    global _TASK_NOTIFICATION_TABLE_READY
    if _TASK_NOTIFICATION_TABLE_READY:
        return

    bind = db.get_bind()
    TaskNotification.__table__.create(bind, checkfirst=True)

    _TASK_NOTIFICATION_TABLE_READY = True


def _record_history(
    db: Session,
    *,
    task_id: int,
    user_id: int,
    action: TaskAction,
    details: Optional[dict] = None,
) -> TaskHistory:
    entry = TaskHistory(
        task_id=task_id,
        user_id=user_id,
        action=action.value,
        details=json.dumps(details or {}, default=_json_default),
        created_at=datetime.utcnow(),
    )
    db.add(entry)
    return entry


def create_task(db: Session, title: str, description: str, assigned_by: int, assigned_to: int, due_date: Optional[datetime]):
    _ensure_task_pass_columns(db)
    task = Task(
        title=title,
        description=description,
        assigned_by=assigned_by,
        assigned_to=assigned_to,
        due_date=due_date,
        status=TaskStatus.PENDING,
    )
    db.add(task)
    db.flush()

    _record_history(
        db,
        task_id=task.task_id,
        user_id=assigned_by,
        action=TaskAction.CREATED,
        details={
            "assigned_to": assigned_to,
            "status": TaskStatus.PENDING.value,
        },
    )

    if assigned_to and assigned_to != assigned_by:
        create_task_notification(
            db,
            task_id=task.task_id,
            recipient_id=assigned_to,
            title="New Task Assigned",
            message=f"You have been assigned a new task: '{task.title}'.",
            pass_details={
                "from": assigned_by,
                "to": assigned_to,
            },
        )

    db.commit()
    db.refresh(task)
    return task

def list_tasks(db: Session, user_id: int):
    _ensure_task_pass_columns(db)
    return (
        db.query(Task)
        .outerjoin(TaskHistory, TaskHistory.task_id == Task.task_id)
        .filter(
            or_(
                Task.assigned_to == user_id,
                Task.assigned_by == user_id,
                TaskHistory.user_id == user_id,
            )
        )
        .distinct()
        .all()
    )

def list_all_tasks(db: Session, department: str = None, roles: list = None):
    _ensure_task_pass_columns(db)
    query = db.query(Task)
    
    if roles:
        # Filter tasks where assigned_to user has one of the specified roles
        query = (
            query
            .join(User, Task.assigned_to == User.user_id)
            .filter(User.role.in_(roles))
            .distinct()
        )
    elif department:
        # Filter tasks where assigned_to or assigned_by user is in the same department
        query = (
            query
            .join(User, or_(Task.assigned_to == User.user_id, Task.assigned_by == User.user_id))
            .filter(User.department == department)
            .distinct()
        )
    
    return query.all()

def update_task_status(db: Session, task_id: int, status: TaskStatus, updated_by: int):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if task:
        previous_status = task.status
        task.status = status
        db.commit()
        db.refresh(task)

        _record_history(
            db,
            task_id=task_id,
            user_id=updated_by,
            action=TaskAction.STATUS_CHANGED,
            details={
                "from": previous_status,
                "to": status.value,
            },
        )
        db.commit()
    return task

def update_task(
    db: Session,
    *,
    task_id: int,
    updates: dict,
    updated_by: int,
):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        return None

    original_values = {}
    for field, value in updates.items():
        original_values[field] = getattr(task, field)
        setattr(task, field, value)

    db.commit()
    db.refresh(task)

    if updates:
        _record_history(
            db,
            task_id=task_id,
            user_id=updated_by,
            action=TaskAction.UPDATED,
            details={
                "changes": {
                    field: {
                        "from": original_values[field],
                        "to": updates[field],
                    }
                    for field in updates
                }
            },
        )
        db.commit()

    return task

def delete_task(db: Session, task_id: int):
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if task:
        db.delete(task)
        db.commit()
    return task


def pass_task(
    db: Session,
    *,
    task_id: int,
    current_user_id: int,
    new_assignee_id: int,
    note: Optional[str] = None,
) -> Optional[Task]:
    _ensure_task_pass_columns(db)
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        return None

    previous_assignee = task.assigned_to
    task.assigned_to = new_assignee_id
    task.last_passed_by = current_user_id
    task.last_passed_to = new_assignee_id
    task.last_pass_note = note
    task.last_passed_at = datetime.utcnow()

    new_assignee = db.query(User).filter(User.user_id == new_assignee_id).first()
    _record_history(
        db,
        task_id=task_id,
        user_id=current_user_id,
        action=TaskAction.PASSED,
        details={
            "from": previous_assignee,
            "to": new_assignee_id,
            "to_name": new_assignee.name if new_assignee else None,
            "note": note,
        },
    )

    db.commit()
    db.refresh(task)
    return task


def get_task_history(db: Session, task_id: int) -> list[TaskHistory]:
    return (
        db.query(TaskHistory)
        .filter(TaskHistory.task_id == task_id)
        .order_by(TaskHistory.created_at.desc())
        .all()
    )


def create_task_notification(
    db: Session,
    *,
    task_id: int,
    recipient_id: int,
    title: str,
    message: str,
    pass_details: Optional[dict] = None,
) -> TaskNotification:
    _ensure_task_notification_table(db)
    notification = TaskNotification(
        user_id=recipient_id,
        task_id=task_id,
        title=title,
        message=message,
        pass_details=json.dumps(pass_details or {}, default=_json_default) if pass_details else None,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def list_task_notifications(db: Session, user_id: int) -> list[TaskNotification]:
    _ensure_task_notification_table(db)
    return (
        db.query(TaskNotification)
        .filter(TaskNotification.user_id == user_id)
        .order_by(TaskNotification.created_at.desc())
        .all()
    )


def mark_task_notification_as_read(
    db: Session,
    *,
    notification_id: int,
    user_id: int,
) -> Optional[TaskNotification]:
    _ensure_task_notification_table(db)
    notification = (
        db.query(TaskNotification)
        .filter(
            TaskNotification.notification_id == notification_id,
            TaskNotification.user_id == user_id,
        )
        .first()
    )

    if not notification:
        return None

    if not notification.is_read:
        notification.is_read = True
        db.commit()
        db.refresh(notification)

    return notification


# ==========================================
# Task Comments CRUD
# ==========================================

def _ensure_task_comment_table(db: Session) -> None:
    global _TASK_COMMENT_TABLE_READY
    if _TASK_COMMENT_TABLE_READY:
        return

    bind = db.get_bind()
    inspector = inspect(bind)
    
    # Check if table exists
    if "task_comments" not in inspector.get_table_names():
        # Create the table if it doesn't exist
        TaskComment.__table__.create(bind, checkfirst=True)
    else:
        # Table exists, check for missing columns
        columns = {col["name"] for col in inspector.get_columns("task_comments")}
        
        statements: list[str] = []
        
        if "message" not in columns:
            statements.append("ALTER TABLE task_comments ADD COLUMN message TEXT")
        if "task_id" not in columns:
            statements.append("ALTER TABLE task_comments ADD COLUMN task_id INTEGER")
        if "user_id" not in columns:
            statements.append("ALTER TABLE task_comments ADD COLUMN user_id INTEGER")
        if "created_at" not in columns:
            statements.append("ALTER TABLE task_comments ADD COLUMN created_at TIMESTAMP")
        
        # If there's an old 'comment' column, drop it or make it nullable
        if "comment" in columns:
            try:
                # Try to drop the old comment column
                db.execute(text("ALTER TABLE task_comments DROP COLUMN comment"))
                print("✅ Dropped old 'comment' column from task_comments table")
            except Exception as e:
                # If drop fails, try to make it nullable with a default
                try:
                    db.execute(text("ALTER TABLE task_comments MODIFY COLUMN comment TEXT NULL DEFAULT NULL"))
                    print("✅ Made 'comment' column nullable in task_comments table")
                except Exception as e2:
                    print(f"Warning: Could not modify comment column: {e2}")
        
        for statement in statements:
            try:
                db.execute(text(statement))
            except Exception as e:
                print(f"Warning: Could not execute {statement}: {e}")
        
        if statements or "comment" in columns:
            db.commit()

    _TASK_COMMENT_TABLE_READY = True


def create_task_comment(
    db: Session,
    *,
    task_id: int,
    user_id: int,
    message: str,
) -> TaskComment:
    _ensure_task_comment_table(db)
    comment = TaskComment(
        task_id=task_id,
        user_id=user_id,
        message=message,
        created_at=datetime.utcnow(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def list_task_comments(db: Session, task_id: int) -> list[dict]:
    _ensure_task_comment_table(db)
    comments = (
        db.query(TaskComment, User.name)
        .join(User, TaskComment.user_id == User.user_id)
        .filter(TaskComment.task_id == task_id)
        .order_by(TaskComment.created_at.asc())
        .all()
    )
    
    result = []
    for comment, user_name in comments:
        result.append({
            "id": comment.id,
            "task_id": comment.task_id,
            "user_id": comment.user_id,
            "message": comment.message,
            "created_at": comment.created_at,
            "user_name": user_name,
        })
    return result


def delete_task_comment(
    db: Session,
    *,
    comment_id: int,
    user_id: int,
) -> bool:
    _ensure_task_comment_table(db)
    comment = (
        db.query(TaskComment)
        .filter(
            TaskComment.id == comment_id,
            TaskComment.user_id == user_id,
        )
        .first()
    )

    if not comment:
        return False

    db.delete(comment)
    db.commit()
    return True
