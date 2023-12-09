import { UsageStatements, UsageStatementsGenerator } from './types.js';
import ts from 'typescript';
import { EOL } from 'os';

/**
 * This class generates generic type declaration.
 *
 * The generator is useful in situations where generic types need to be declared
 * as parameters, for example when defining a temporary type.
 *
 * Example:
 * type TemporaryType<here goes output from this generator> = {}
 */
export class GenericTypeParameterDeclarationUsageStatementsGenerator
  implements UsageStatementsGenerator
{
  /**
   * Constructor
   */
  constructor(
    private readonly typeParameters:
      | ts.NodeArray<ts.TypeParameterDeclaration>
      | undefined
  ) {}

  /**
   * @inheritDoc
   */
  generate = (): UsageStatements => {
    if (!this.typeParameters || this.typeParameters.length === 0) {
      return {};
    }

    return {
      usageStatement: `<${this.typeParameters
        .map((item) => item.getText())
        .join(', ')}>`,
    };
  };
}

/**
 * This class generates generic type usage.
 *
 * The generator is useful in situations where generic types need to be provided
 * as parameters for types demanding that.
 *
 * Example:
 * type SomeType<T> = {};
 * const someFunction(param: SomeType<here goes output from this generator>);
 *
 * Note: this generator generates minimal required usage at this time.
 */
export class GenericTypeParameterUsageStatementsGenerator
  implements UsageStatementsGenerator
{
  /**
   * Constructor
   */
  constructor(
    private readonly typeParameters:
      | ts.NodeArray<ts.TypeParameterDeclaration>
      | undefined
  ) {}

  /**
   * @inheritDoc
   */
  generate = (): UsageStatements => {
    if (!this.typeParameters || this.typeParameters.length === 0) {
      return {};
    }
    const parametersWithoutDefaults = this.typeParameters.filter(
      (parameter) => !parameter.default
    );
    if (parametersWithoutDefaults.length === 0) {
      return {};
    }
    const statements: Array<string> = [];
    for (const typeParameter of parametersWithoutDefaults) {
      if (typeParameter.constraint) {
        statements.push(typeParameter.constraint.getText());
      } else {
        statements.push('string');
      }
    }
    return { usageStatement: `<${statements.join(', ')}>` };
  };
}

/**
 * Generates import statements from import declarations.
 *
 * This is a pass through process. Imports present in API.md report are
 * required for types defined in that report.
 */
export class ImportUsageStatementsGenerator
  implements UsageStatementsGenerator
{
  /**
   * @inheritDoc
   */
  constructor(private readonly node: ts.ImportDeclaration) {}
  generate = (): UsageStatements => {
    return {
      importStatement: this.node.getText(),
    };
  };
}

/**
 * Generates statements for types defined in API.md.
 *
 * The generated statements attempt to define old version of type under new alias
 * and then attempt to assign old alias to new alias. If new alias does not contain
 * breaks then this procedure should compile successfully.
 *
 * Example:
 * type SampleTypeBaseline = {}
 * const SampleTypeUsageFunction = (sampleTypeFunctionParameter: SampleTypeBaseline) => {
 *     const sampleType: SampleType = sampleTypeFunctionParameter;
 * }
 *
 * Note: using a function closure relieves us from mocking values.
 */
export class TypeUsageStatementsGenerator implements UsageStatementsGenerator {
  /**
   * @inheritDoc
   */
  constructor(
    private readonly typeAliasDeclaration: ts.TypeAliasDeclaration,
    private readonly packageName: string
  ) {}
  generate = (): UsageStatements => {
    const typeName = this.typeAliasDeclaration.name.getText();
    const constName = toLowerCamelCase(typeName);
    const genericTypeParametersDeclaration =
      new GenericTypeParameterDeclarationUsageStatementsGenerator(
        this.typeAliasDeclaration.typeParameters
      ).generate().usageStatement ?? '';
    const genericTypeParameters =
      new GenericTypeParameterUsageStatementsGenerator(
        this.typeAliasDeclaration.typeParameters
      ).generate().usageStatement ?? '';
    const baselineTypeName = `${typeName}Baseline`;
    const functionParameterName = `${constName}FunctionParameter`;
    // declare type with same content under different name.
    let usageStatement = `type ${baselineTypeName}${genericTypeParametersDeclaration} = ${this.typeAliasDeclaration.type.getText()}${EOL}`;
    // add statement that checks if old type can be assigned to new type.
    usageStatement += `const ${typeName}UsageFunction = (${functionParameterName}: ${baselineTypeName}${genericTypeParameters}) => {${EOL}`;
    usageStatement += `    const ${constName}: ${typeName}${genericTypeParameters} = ${functionParameterName};${EOL}`;
    usageStatement += `}${EOL}`;
    return {
      importStatement: `import { ${typeName} } from '${this.packageName}';`,
      usageStatement: usageStatement,
    };
  };
}

/**
 * Generates usage of an enum
 *
 * The statements generated attempt to use all enum members, so that
 * member removal will be flagged.
 *
 * Example:
 * let sampleEnumUsageVariable: SampleEnum;
 * sampleEnumUsageVariable = SampleEnum.FIRST_MEMBER;
 * sampleEnumUsageVariable = SampleEnum.SECOND_MEMBER;
 */
export class EnumUsageStatementsGenerator implements UsageStatementsGenerator {
  /**
   * @inheritDoc
   */
  constructor(
    private readonly enumDeclaration: ts.EnumDeclaration,
    private readonly packageName: string
  ) {}
  generate = (): UsageStatements => {
    const enumName = this.enumDeclaration.name.getText();
    const varName = `${toLowerCamelCase(enumName)}UsageVariable`;
    let usageStatement = `let ${varName}: ${enumName};${EOL}`;
    for (const enumMember of this.enumDeclaration.members) {
      usageStatement += `${varName} = ${enumName}.${enumMember.name.getText()};${EOL}`;
    }
    return {
      importStatement: `import { ${enumName} } from '${this.packageName}';`,
      usageStatement: usageStatement,
    };
  };
}

/**
 * Generates usage of a class
 *
 * TODO this only emits import to satisfy symbols potentially using this class until we figure out how to generate usage snippets
 */
export class ClassUsageStatementsGenerator implements UsageStatementsGenerator {
  /**
   * @inheritDoc
   */
  constructor(
    private readonly classDeclaration: ts.ClassDeclaration,
    private readonly packageName: string
  ) {}
  generate = (): UsageStatements => {
    const className = this.classDeclaration.name?.getText();
    if (!className) {
      throw new Error('Class name is missing');
    }

    return {
      importStatement: `import { ${className} } from '${this.packageName}';`,
    };
  };
}

/**
 * Generates usage of a variable/const/arrow function
 *
 * TODO this only emits import to satisfy symbols potentially using this variable until we figure out how to generate usage snippets
 */
export class VariableUsageStatementsGenerator
  implements UsageStatementsGenerator
{
  /**
   * @inheritDoc
   */
  constructor(
    private readonly variableStatement: ts.VariableStatement,
    private readonly packageName: string
  ) {}
  generate = (): UsageStatements => {
    if (this.variableStatement.declarationList.declarations.length != 1) {
      throw new Error('Unexpected variable declarations count');
    }
    const variableName =
      this.variableStatement.declarationList.declarations[0].name.getText();
    // TODO only emit import to satisfy symbols potentially using this symbol
    // until we figure out how to generate usage snippets
    return {
      importStatement: `import { ${variableName} } from '${this.packageName}';`,
    };
  };
}

const toLowerCamelCase = (name: string): string => {
  return `${name?.substring(0, 1).toLowerCase()}${name?.substring(1)}`;
};
