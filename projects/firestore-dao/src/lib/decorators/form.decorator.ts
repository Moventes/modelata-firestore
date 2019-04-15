import { Validator, ValidatorFn } from '@angular/forms';

export function FormControlValidators(value: Array<Validator | ValidatorFn> = []) {
  return function (target: any, propertyKey: string) {
    if (typeof target['_controls'] !== 'object') {
      target['_controls'] = {};
    }
    if (!target['_controls'][propertyKey] || target['_controls'][propertyKey].length === 0) {
      target['_controls'][propertyKey] = value;
    }
  };
}

export function ToFormControl() {
  return function (target: any, propertyKey: string) {
    if (typeof target['_controls'] !== 'object') {
      target['_controls'] = {};
    }
    if (!target['_controls'][propertyKey]) {
      target['_controls'][propertyKey] = [];
    }
  };
}

export function NotInFormControl() {
  return function (target: any, propertyKey: string) {
    if (typeof target['_notControls'] !== 'object') {
      target['_notControls'] = {};
    }
    target['_notControls'][propertyKey] = true;
  };
}
