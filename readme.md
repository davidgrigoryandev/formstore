# FormStore: Reusable store for form control
## Usage
```bash
 public formValues: Form = {
    personalData: {
      firstName: {
        value: '',
        error: null,
        validation: NAME,
      },
      surname: {
        value: '',
        error: null,
        validation: NAME,
      },
      middleName: {
        value: '',
        error: null,
        validation: NAME_NOT_REQUIRED,
      },
      isLegalEntity: {
        value: false,
        excludeFromFillPercent: true,
      },
      approvedPolicy: {
        value: false,
        excludeFromFillPercent: true,
        excludeFromRequestData: true,
        validation: TRUE_VALUE,
      },
    },
  };

  public form = new FormStore<Form>(this.formValues);
```
You can have object of any nesting depth as your form.

###Field type
```
interface FieldValue<ValueType = string> {
  value: ValueType | '' ( Required field for value )
  error?: string; ( Error message )
  warning?: string; ( Warning message )
  excludeFromFillPercent?: boolean; ( True for not required or `always with value` fields  )
  excludeFromRequestData?: boolean; ( True for fields that will not go to request JSON )
  hidden?: boolean; ( True for fields that will not be validated and will be excluded from fill percent and request JSON )
  validation?: AnySchema; ( YUP Validation schema )
}
```
###Methods
```
get formValues()
    Returns form object with fields that have `FieldValue` type
```
```
getField(field: String path for field. Example` 'personalData.firstName')
    Returns object with `FieldValue` type
```
```
get isFormValid()
    Checks the validity of all fields and returns boolean
```
```
get formSuccessPercent()
    Checks the filled state and validity of all fields
    and returns the fill percent as number
```
```
get formError()
    Returns form error object: { isError: boolean, message: string}
```
```
get formWarning()
    Returns form warning object: { isWarning: boolean, message: string}
```
```
get formJSONData()
    Returns ready-to-send data with form values with same structure,
    replacing `FieldValue` objects with value
```
```
register = (
    field: String path for field. Example` 'personalData.firstName'
    params?: RegisterParams ({onChangeValue: any value})
  )
    Takes field name and optional param( if the value is not e.target.value )
    Returns object of props for that field`
    onChange, onBlur( for running the validation ),
    status( 'error' | 'warning' ), helpText( error or warning message )
```
```
changeInput = (
    field: String path for field. Example` 'personalData.firstName'
    value: string | boolean | Date | number | FileList
  ): void
    Takes field name and value
    Changes the field value in the form, resets errors and warnings
```
```
changeHidden = (
    field: String path for field. Example` 'personalData.firstName'
    isHidden: boolean
  ):void
    Takes field name and isHidden
    Hides or unhides fields, so if they are hidden they will not be
    validated and included in formJSONData and formSuccessPercent.
```
```
setFormData(data: JSON data that comes from backend)
    Parses the data and fills it in the form
    as fields with type `FieldValue`
```
```
setFormError = (message: string)
    Takes message, and sets as form error
```
```
setFormWarning = (message: string)
    Takes message, and sets as form warning
```
```
validate = async (field: String path for field. Example` 'personalData.firstName')
    Takes field name, makes async validation and add some
    error messages in field if there are some
```
```
resetForm = ()=>void
    Resets the form
```
```
private _checkFormValidity
    Checks the form validity and returns boolean
```


