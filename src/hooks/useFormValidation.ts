import { useState } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  rules: ValidationRules
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};

    Object.keys(rules).forEach((key) => {
      const rule = rules[key];
      const value = values[key as keyof T] as string;

      if (rule.required && !value?.trim()) {
        newErrors[key as keyof T] = 'Поле обязательно для заполнения';
        return;
      }

      if (value && rule.minLength && value.length < rule.minLength) {
        newErrors[key as keyof T] = `Минимум ${rule.minLength} символов`;
        return;
      }

      if (value && rule.maxLength && value.length > rule.maxLength) {
        newErrors[key as keyof T] = `Максимум ${rule.maxLength} символов`;
        return;
      }

      if (value && rule.pattern && !rule.pattern.test(value)) {
        newErrors[key as keyof T] = 'Неверный формат';
        return;
      }

      if (value && rule.custom) {
        const customError = rule.custom(value);
        if (customError) {
          newErrors[key as keyof T] = customError;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const setValue = (key: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  return {
    values,
    errors,
    setValue,
    validate,
    setValues,
  };
}
