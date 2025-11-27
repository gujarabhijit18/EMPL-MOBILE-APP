declare module 'lucide-react-native' {
  import { ComponentProps } from 'react';
  export interface LucideProps extends ComponentProps<'svg'> {
    size?: number;
    color?: string;
    stroke?: string;
    fill?: string;
  }
  export const ChevronDown: React.FC<LucideProps>;
  export const Calendar: React.FC<LucideProps>;
  export const Check: React.FC<LucideProps>;
  export const Circle: React.FC<LucideProps>;
  export const ChevronRight: React.FC<LucideProps>;
  export const ChevronLeft: React.FC<LucideProps>;
  export const ChevronUp: React.FC<LucideProps>;
  export const Search: React.FC<LucideProps>;
  export const X: React.FC<LucideProps>;
  export const MoreHorizontal: React.FC<LucideProps>;
  export const PanelLeft: React.FC<LucideProps>;
  export const GripVertical: React.FC<LucideProps>;
  export const Dot: React.FC<LucideProps>;
  export const Briefcase: React.FC<LucideProps>;
  export const Users: React.FC<LucideProps>;
  export const Plus: React.FC<LucideProps>;
  export const Clock: React.FC<LucideProps>;
  export const ClipboardList: React.FC<LucideProps>;
  export const AlertCircle: React.FC<LucideProps>;
  export const CheckCircle2: React.FC<LucideProps>;
  export const TrendingUp: React.FC<LucideProps>;
  export const Activity: React.FC<LucideProps>;
  export const ChevronRight: React.FC<LucideProps>;
}
