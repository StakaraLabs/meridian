import 'reflect-metadata';
/**
 * Decorator for marking a class as a database table
 */
export declare function Table(options: {
    name: string;
}): (constructor: Function) => void;
/**
 * Decorator for marking a property as a database column
 */
export declare function Column(options?: {
    name?: string;
    primary?: boolean;
    nullable?: boolean;
    unique?: boolean;
    type?: string;
    default?: () => string;
}): (target: any, propertyKey: string) => void;
/**
 * Decorator for marking a property as a foreign key
 */
export declare function ForeignKey(tableName: string, columnName: string): (target: any, propertyKey: string) => void;
/**
 * Decorator for vector columns
 * @param dimensions The dimensions of the vector
 * @returns The decorator function
 */
export declare function VectorColumn(dimensions: number): (target: any, propertyKey: string) => void;
