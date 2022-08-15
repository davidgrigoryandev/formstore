import {
  computed,
  extendObservable,
  makeObservable,
  observable,
  runInAction,
  toJS,
} from 'mobx';
import {cloneDeep, get} from 'lodash';
import { AnySchema } from 'yup';

export interface FieldValue<ValueType = string> {
  value: ValueType | '';
  error?: string;
  warning?: string;
  excludeFromFillPercent?: boolean;
  excludeFromRequestData?: boolean;
  hidden?: boolean;
  validation?: AnySchema;
}


type PathsToFieldNameProps<T> = T extends FieldValue<any>
  ? []
  : {
      [K in Extract<keyof T, string>]: [K, ...PathsToFieldNameProps<T[K]>];
    }[Extract<keyof T, string>];

type Join<T extends string[], D extends string> = T extends []
  ? never
  : T extends [infer F]
  ? F
  : T extends [infer F, ...infer R]
  ? F extends string
    ? `${F}${D}${Join<Extract<R, string[]>, D>}`
    : never
  : string;

interface RegisterParams {
  onChangeValue?: string | Date | boolean | number;
}

export type StringValues<Obj, TypeToConvert> = {
  [Key in keyof Obj]: Obj[Key] extends TypeToConvert
    ? string | boolean | FileList | Date | number
    : StringValues<Obj[Key], TypeToConvert>;
};

class FormStore<FormType extends Record<string, any>> {
  constructor(form: FormType) {
    extendObservable(this, {
      form: this.form,
    });
    makeObservable(this, {
      formValues: computed,
      isFormValid: computed,
      changeInput: observable,
      changeHidden: observable,
      validate: observable,
      formErrorData: observable,
      formWarningData: observable,
      getField: observable,
      formError: computed,
      formWarning: computed,
      setFormError: observable,
      setFormWarning: observable,
      resetForm: observable,
      isValidating: observable,
      isFormLoading: observable,
    });
    this.form = form;
    this.initialForm = cloneDeep(this.form);
  }

  form;

  initialForm;

  isValidating = false;

  isFormLoading = false;

  formErrorData = {
    isError: false,
    message: '',
  };

  formWarningData = {
    isWarning: false,
    message: '',
  };

  getField = (field: Join<PathsToFieldNameProps<FormType>, '.'>) =>
    get(this.form, field);

  get formValues(): FormType {
    return toJS(this.form);
  }

  get isFormValid() {
    return this._checkFormValidity();
  }

  get formSuccessPercent() {
    const result = { count: 0, filled: 0 };
    const notFilled = [];
    const calculateSuccessPercent = (form) =>
      Object.keys(form).forEach((key) => {
        if (typeof form[key] === 'object' && form[key] !== null) {
          if (form[key].hidden) return true;
          if (
            form[key].value !== undefined &&
            !form[key].excludeFromFillPercent &&
            !form[key].hidden
          ) {
            if (form[key]?.validation) {
              try {
                form[key].validation.validateSync(form[key]?.value);
                result.count += 1;
                result.filled += 1;
              } catch (e) {
                result.count += 1;
                notFilled.push(key, form[key]);
              }
            } else {
              result.count += 1;
              if (
                form[key].value !== '' &&
                form[key].value !== null &&
                `${form[key].value}`.trim().length &&
                !form[key].error
              ) {
                result.filled += 1;
              } else {
                notFilled.push(key, form[key]);
              }
            }
          }
          return calculateSuccessPercent(form[key]);
        }
        return null;
      });

    calculateSuccessPercent(this.form);
    return Math.round((result.filled / result.count) * 100);
  }

  get formJSONData(): StringValues<FormType, FieldValue> {
    const createFinalData = (form) =>
      Object.keys(form).reduce((acc, key) => {
        if (
          typeof form[key] === 'object' &&
          form[key] !== null &&
          !form[key].hidden
        ) {
          if (
            form[key].value !== undefined &&
            !form[key].excludeFromRequestData
          ) {
            return { ...acc, [key]: form[key].value };
          }
          if (form[key].value === undefined) {
            return { ...acc, [key]: createFinalData(form[key]) };
          }
        }
        return acc;
      }, {});
    return createFinalData(this.form);
  }

  get formError() {
    return toJS(this.formErrorData);
  }

  get formWarning() {
    return toJS(this.formWarningData);
  }

  register = (
    field: Join<PathsToFieldNameProps<FormType>, '.'>,
    params?: RegisterParams
  ) => {
    let status: 'error' | 'warning' = null;
    let helpText = '';
    if (this.getField(field).error || this.formError.isError) {
      status = 'error';
      helpText = this.getField(field).error;
    } else if (this.getField(field).warning || this.formWarning.isWarning) {
      status = 'warning';
      helpText = this.getField(field).warning;
    }

    return {
      onChange: (e) => {
        const value = params?.onChangeValue ?? e.target.value;
        this.changeInput(field, value);
      },
      onBlur: (e) => {
        this.validate(field);
      },
      value: this.getField(field).value,
      status,
      helpText,
    };
  };

  changeInput = (
    field: Join<PathsToFieldNameProps<FormType>, '.'>,
    value: string | boolean | Date | number | FileList
  ) => {
    get(this.form, field).value = value;
    if (get(this.form, field).error) {
      this.validate(field);
    }
    this.formErrorData = {
      isError: false,
      message: '',
    };
    this.formWarningData = {
      isWarning: false,
      message: '',
    };
  };

  changeHidden = (
    field: Join<PathsToFieldNameProps<FormType>, '.'> | string,
    isHidden: boolean
  ) => {
    get(this.form, field).hidden = isHidden;
  };

  setFormData = (data) => {
    let keyChain = '';
    const getField = (field: string) =>
      toJS(this.getField(field as Join<PathsToFieldNameProps<FormType>, '.'>));
    const createFinalData = (responseData) =>
      Object.keys(responseData).reduce((acc, key) => {
        keyChain += `${keyChain ? '.' : ''}${key}`;
        if (
          typeof responseData[key] === 'object' &&
          responseData[key] !== null
        ) {
          let fields;
          if (responseData[key].setAsItIs) {
            delete responseData[key].setAsItIs;
            fields = {
              ...acc,
              [key]: {
                ...getField(keyChain),
                ...responseData[key],
              },
            };
          } else {
            fields = {
              ...acc,
              [key]: {
                ...getField(keyChain),
                ...createFinalData(responseData[key]),
              },
            };
          }
          keyChain = keyChain.split('.').slice(0, -1).join('.');
          return fields;
        }
        let field;
        if (responseData[key] === null) {
          field = {
            ...acc,
            [key]: toJS(get(this.form, keyChain)),
          };
        } else {
          field = {
            ...acc,
            [key]: {
              ...getField(keyChain),
              value:
                responseData[key] === '0001-01-01T00:00:00Z'
                  ? null
                  : responseData[key],
              error: null,
            },
          };
        }
        const sliceKeyChain = () => {
          if (!keyChain) return;
          keyChain = keyChain.split('.').slice(0, -1).join('.');
          if (!getField(keyChain)) {
            sliceKeyChain();
          }
        };
        sliceKeyChain();

        return field;
      }, {});
    const finalData = createFinalData(data);
    this.form = finalData;
  };

  setFormError = (message: string) => {
    this.formErrorData = {
      isError: true,
      message,
    };
  };

  setFormWarning = (message: string) => {
    this.formWarningData = {
      isWarning: true,
      message,
    };
  };

  setFormLoading = (value: boolean) => {
    this.isFormLoading = value;
  };

  validate = async (field) => {
    try {
      const formField = get(this.form, field);
      await formField?.validation?.validate?.(formField.value);
      runInAction(() => {
        get(this.form, field).error = null;
      });
    } catch (e) {
      runInAction(() => {
        get(this.form, field).error = e.message;
      });
    }
  };

  _checkFormValidity = () => {
    let isValid = true;
    const invalidItems = [];
    const validateRecursive = (data) => {
      const keys = Object.keys(data);
      for (let i = 0; i < keys.length; i += 1) {
        const item = data[keys[i]];
        if (typeof item === 'object' && item !== null) {
          if (!item.hidden) {
            if (item.value !== undefined) {
              try {
                item.validation?.validateSync(item.value);
              } catch (e) {
                invalidItems.push({
                  [keys[i]]: item,
                });
                isValid = false;
              }
            } else {
              validateRecursive(item);
            }
          }
        }
      }
    };
    validateRecursive(this.form);
    return isValid;
  };

  resetForm = () => {
    this.form = this.initialForm;
    this.formErrorData = {
      isError: false,
      message: '',
    };

    this.formWarningData = {
      isWarning: false,
      message: '',
    };
  };
}

export default FormStore;
