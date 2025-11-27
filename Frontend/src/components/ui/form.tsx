import React, { createContext, useContext, useRef } from "react";
import { View, Text, TextInput, StyleSheet, Platform } from "react-native";
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form";

// ✅ Export FormProvider directly for usage
export const Form = FormProvider;

/* --------------------------
 * Context Definitions
 * -------------------------- */
type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

const FormFieldContext = createContext<FormFieldContextValue | null>(null);
type FormItemContextValue = { id: string };
const FormItemContext = createContext<FormItemContextValue | null>(null);

/* --------------------------
 * useFormField Hook
 * -------------------------- */
export const useFormField = () => {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext)
    throw new Error("❌ useFormField must be used within <FormField>");

  const fieldState = getFieldState(fieldContext.name, formState);
  const id = itemContext?.id;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

/* --------------------------
 * FormItem Component
 * -------------------------- */
export const FormItem: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  children,
  ...props
}) => {
  // ✅ Expo-safe unique ID
  const id = useRef(`form-item-${Math.random().toString(36).substring(2, 9)}`);

  return (
    <FormItemContext.Provider value={{ id: id.current }}>
      <View style={[styles.formItem, style]} {...props}>
        {children}
      </View>
    </FormItemContext.Provider>
  );
};

/* --------------------------
 * FormField Component
 * -------------------------- */
export const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(
  props: ControllerProps<TFieldValues, TName>
) => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
);

/* --------------------------
 * FormLabel Component
 * -------------------------- */
export const FormLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { error } = useFormField();
  return (
    <Text
      style={[
        styles.label,
        error ? { color: "#DC2626" } : { color: "#111827" },
      ]}
    >
      {children}
    </Text>
  );
};

/* --------------------------
 * FormControl Component
 * -------------------------- */
export const FormControl: React.FC<{
  control: any;
  name: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
}> = ({ control, name, placeholder, secureTextEntry, keyboardType }) => {
  const { error } = useFormField();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={[styles.inputWrapper, error && styles.inputError]}>
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
        </View>
      )}
    />
  );
};

/* --------------------------
 * FormDescription Component
 * -------------------------- */
export const FormDescription: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { formDescriptionId } = useFormField();
  return (
    <Text style={styles.description} nativeID={formDescriptionId}>
      {children}
    </Text>
  );
};

/* --------------------------
 * FormMessage Component
 * -------------------------- */
export const FormMessage: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { error, formMessageId } = useFormField();
  const body = error?.message || children;

  if (!body) return null;

  return (
    <Text style={styles.errorText} nativeID={formMessageId}>
      {body}
    </Text>
  );
};

/* --------------------------
 * Styles
 * -------------------------- */
const styles = StyleSheet.create({
  formItem: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  input: {
    fontSize: 15,
    color: "#111827",
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
  },
  inputError: {
    borderColor: "#DC2626",
  },
  description: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
});

export default Form;
