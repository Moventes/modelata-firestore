import { Validator } from '@angular/forms';

export function ToFormControl(value: Array<Validator> = []) {
  return function(target: any, propertyKey: string) {
    if (!target['_controls']) {
      target['_controls'] = {};
    }
    target['_controls'][propertyKey] = value;
  };
}
