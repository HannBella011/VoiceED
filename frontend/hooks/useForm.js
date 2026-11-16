// useForm - VoiceED
// Hook for form state management

'use client';

import { useState, useCallback } from 'react';

export function useForm(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleBlur = useCallback((name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const validate = useCallback(
    (validationRules) => {
      const newErrors = {};
      let isValid = true;
      Object.keys(validationRules).forEach((key) => {
        const error = validationRules[key](values[key]);
        if (error) {
          newErrors[key] = error;
          isValid = false;
        }
      });
      setErrors(newErrors);
      return isValid;
    },
    [values]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    reset,
    setValues,
  };
}

export default useForm;
