import 'reflect-metadata';
import { inferType } from '../../../lib/sql/migration';

// Test class with various property types
class TestClass {
  // Simple types
  stringProp: string = '';
  numberProp: number = 0;
  booleanProp: boolean = false;
  dateProp: Date = new Date();
  
  // Union types
  nullableString: string | null = null;
  undefinableString: string | undefined = undefined;
  nullableNumber: number | null = null;
  
  // Array and object types
  stringArray: string[] = [];
  numberArray: number[] = [];
  objectProp: Record<string, any> = {};
}

describe('Type Inference', () => {
  it('should log the metadata type for each property', () => {
    // Get the type metadata for each property
    const properties = [
      'stringProp', 'numberProp', 'booleanProp', 'dateProp',
      'nullableString', 'undefinableString', 'nullableNumber',
      'stringArray', 'numberArray', 'objectProp'
    ];
    
    for (const prop of properties) {
      const type = Reflect.getMetadata('design:type', TestClass.prototype, prop);
      console.log(`${prop} type:`, type?.name);
    }
  });
  
  it('should test the inferType function with different property types', () => {
    // Create a test object
    const testObj = new TestClass();
    
    // Test inferType for each property
    const properties = [
      'stringProp', 'numberProp', 'booleanProp', 'dateProp',
      'nullableString', 'undefinableString', 'nullableNumber',
      'stringArray', 'numberArray', 'objectProp'
    ];
    
    for (const prop of properties) {
      const sqlType = inferType(TestClass.prototype, prop);
      console.log(`${prop} SQL type:`, sqlType);
    }
  });
}); 