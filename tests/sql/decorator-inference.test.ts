import 'reflect-metadata';
import { Table, Column } from '../../../lib/sql/decorators';

@Table({ name: 'test_table' })
class TestClass {
  @Column()
  stringProp: string = '';

  @Column()
  numberProp: number = 0;

  @Column()
  booleanProp: boolean = false;

  @Column()
  dateProp: Date = new Date();
  
  @Column({ nullable: true })
  nullableString: string | null = null;

  @Column({ nullable: true })
  undefinableString: string | undefined = undefined;

  @Column({ nullable: true })
  nullableNumber: number | null = null;
  
  @Column()
  stringArray: string[] = [];

  @Column()
  numberArray: number[] = [];

  @Column()
  objectProp: Record<string, any> = {};
}

describe('Decorator Type Inference', () => {
  it('should log the inferred SQL type for each property', () => {
    // Get the columns metadata
    const columns = Reflect.getMetadata('columns', TestClass) || {};
    
    // Log the inferred type for each property
    for (const [prop, metadata] of Object.entries(columns)) {
      console.log(`${prop} inferred SQL type:`, (metadata as any).type);
    }
  });
}); 