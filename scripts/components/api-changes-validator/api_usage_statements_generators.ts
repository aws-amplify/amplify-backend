import {
  UsageStatementsGenerator,
  UsageStatementsGeneratorOutput,
} from './types.js';
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
  generate = (): UsageStatementsGeneratorOutput => {
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
 * const someFunction = <T1, T2>(param: SomeType<here goes output from this generator>) => {...};
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
  generate = (): UsageStatementsGeneratorOutput => {
    if (!this.typeParameters || this.typeParameters.length === 0) {
      return {};
    }
    return {
      usageStatement: `<${this.typeParameters
        .map((item) => item.name.getText())
        .join(', ')}>`,
    };
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
  generate = (): UsageStatementsGeneratorOutput => {
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
    private readonly packageName: string,
    private readonly excludedTypes: Array<string>
  ) {}
  generate = (): UsageStatementsGeneratorOutput => {
    const typeName = this.typeAliasDeclaration.name.getText();
    if (this.excludedTypes.includes(typeName)) {
      return {};
    }
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
    const assignmentStatement = `const ${constName}: ${typeName}${genericTypeParameters} = ${functionParameterName};`;
    usageStatement += `const ${toLowerCamelCase(
      typeName
    )}UsageFunction = ${genericTypeParametersDeclaration}(${functionParameterName}: ${baselineTypeName}${genericTypeParameters}) => {${EOL}`;
    usageStatement += `${indent(assignmentStatement)}${EOL}`;
    usageStatement += `}${EOL}`;
    return {
      symbolDescriptor: {
        symbolName: typeName,
      },
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
  generate = (): UsageStatementsGeneratorOutput => {
    const enumName = this.enumDeclaration.name.getText();
    const varName = `${toLowerCamelCase(enumName)}UsageVariable`;
    let usageStatement = `let ${varName}: ${enumName};${EOL}`;
    for (const enumMember of this.enumDeclaration.members) {
      usageStatement += `${varName} = ${enumName}.${enumMember.name.getText()};${EOL}`;
    }
    return {
      symbolDescriptor: {
        symbolName: enumName,
      },
      usageStatement: usageStatement,
    };
  };
}

/**
 * Generates usage of a class.
 * Classes can be inherently incompatible in assignments
 * if they have private members, see https://github.com/microsoft/TypeScript/issues/53558.
 * Therefore strategy for classes is different. Instead of testing assignability
 * like we do for types we generate usage of it's members.
 */
export class ClassUsageStatementsGenerator implements UsageStatementsGenerator {
  /**
   * @inheritDoc
   */
  constructor(
    private readonly classDeclaration: ts.ClassDeclaration,
    private readonly packageName: string
  ) {}
  generate = (): UsageStatementsGeneratorOutput => {
    const className = this.classDeclaration.name?.getText();
    if (!className) {
      throw new Error('Class name is missing');
    }

    let usageStatement = '';
    for (const classMember of this.classDeclaration.members) {
      switch (classMember.kind) {
        case ts.SyntaxKind.PropertyDeclaration:
          usageStatement +=
            new ClassPropertyUsageStatementsGenerator(
              this.classDeclaration,
              classMember as ts.PropertyDeclaration
            ).generate().usageStatement ?? '';
          break;
        case ts.SyntaxKind.Constructor:
          usageStatement +=
            new ClassConstructorUsageStatementsGenerator(
              this.classDeclaration,
              classMember as ts.ConstructorDeclaration
            ).generate().usageStatement ?? '';
          break;
        default:
          console.log(
            `Warning: class usage generator encountered unrecognized member kind ${classMember.kind}`
          );
      }
    }

    if (this.classDeclaration.heritageClauses) {
      usageStatement +=
        new ClassInheritanceUsageStatementsGenerator(
          this.classDeclaration,
          this.classDeclaration.heritageClauses
        ).generate().usageStatement ?? '';
    }

    if (usageStatement) {
      usageStatement += EOL;
    }

    return {
      symbolDescriptor: {
        symbolName: className,
      },
      usageStatement,
    };
  };
}

/**
 * Generates usage patterns for class properties which can be either fields or methods,
 * static or instance scope.
 *
 * Generated code consists of:
 * 1. outer function which role is to provide parameter reference of class type
 * 2. inner statement which might be either:
 *    - attempt to read property and assign its value to local const.
 *    - attempt to call method, which is wrapped in inner function that provides parameters for the method call.
 */
class ClassPropertyUsageStatementsGenerator
  implements UsageStatementsGenerator
{
  constructor(
    private readonly classDeclaration: ts.ClassDeclaration,
    private readonly propertyDeclaration: ts.PropertyDeclaration
  ) {}
  generate = (): UsageStatementsGeneratorOutput => {
    const className = this.classDeclaration.name?.getText();
    if (!className) {
      throw new Error('Class name is missing');
    }
    const memberName = this.propertyDeclaration.name.getText();
    const isStatic = this.propertyDeclaration.modifiers?.find(
      (modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword
    );
    const outerUsageFunctionName = toLowerCamelCase(
      `${className}${toPascalCase(memberName)}UsageOuterFunction`
    );
    const outerUsageFunctionParameterName = `${outerUsageFunctionName}Parameter`;
    const genericTypeParametersDeclaration =
      new GenericTypeParameterDeclarationUsageStatementsGenerator(
        this.classDeclaration.typeParameters
      ).generate().usageStatement ?? '';
    const genericTypeParameters =
      new GenericTypeParameterUsageStatementsGenerator(
        this.classDeclaration.typeParameters
      ).generate().usageStatement ?? '';

    let innerUsageStatement = '';
    const callableSymbol = isStatic
      ? `${className}.${memberName}`
      : `${outerUsageFunctionParameterName}.${memberName}`;
    if (this.propertyDeclaration.type?.kind === ts.SyntaxKind.FunctionType) {
      innerUsageStatement =
        new CallableUsageStatementsGenerator(
          this.propertyDeclaration.type as ts.FunctionTypeNode,
          callableSymbol,
          `${className}${toPascalCase(memberName)}UsageInnerFunction`
        ).generate().usageStatement ?? '';
    } else {
      let propertyType = `${this.propertyDeclaration.type?.getText() ?? ''}`;
      if (this.propertyDeclaration.questionToken) {
        // it's fine to append duplicate ' | undefined' if type already has it.
        propertyType += ' | undefined';
      }
      innerUsageStatement = `const propertyValue: ${propertyType} = ${callableSymbol};`;
    }

    let usageStatement = '';
    usageStatement += `const ${outerUsageFunctionName} = ${genericTypeParametersDeclaration}(${outerUsageFunctionParameterName}: ${className}${genericTypeParameters}) => {${EOL}`;
    usageStatement += `${indent(innerUsageStatement)}${EOL}`;
    usageStatement += `}${EOL}`;
    return { usageStatement };
  };
}

/**
 * Generates usage snippets for class constructor.
 */
class ClassConstructorUsageStatementsGenerator
  implements UsageStatementsGenerator
{
  constructor(
    private readonly classDeclaration: ts.ClassDeclaration,
    private readonly constructorDeclaration: ts.ConstructorDeclaration
  ) {}

  generate = (): UsageStatementsGeneratorOutput => {
    const isAbstract = this.classDeclaration.modifiers?.find(
      (modifier) => modifier.kind === ts.SyntaxKind.AbstractKeyword
    );
    if (isAbstract) {
      return this.generateAbstractClassConstructorUsage();
    }
    return this.generateConcreteClassConstructorUsage();
  };

  /**
   * Generates usage patterns of concrete class constructor.
   * Generated snippets attempt to invoke constructor with min and max parameters.
   * Enclosing usage function is used to deliver parameters for constructor call.
   */
  private generateConcreteClassConstructorUsage =
    (): UsageStatementsGeneratorOutput => {
      const className = this.classDeclaration.name?.getText();
      if (!className) {
        throw new Error('Class name is missing');
      }
      const usageFunctionName = toLowerCamelCase(
        `${className}ConstructorUsageFunction`
      );
      const usageFunctionParameterDeclaration =
        new CallableParameterDeclarationUsageStatementsGenerator(
          this.constructorDeclaration.parameters
        ).generate().usageStatement ?? '';
      const usageFunctionGenericParametersDeclaration =
        new GenericTypeParameterDeclarationUsageStatementsGenerator(
          this.classDeclaration.typeParameters
        ).generate().usageStatement ?? '';
      const minParameterUsage =
        new CallableParameterUsageStatementsGenerator(
          this.constructorDeclaration.parameters,
          'min'
        ).generate().usageStatement ?? '';
      const maxParameterUsage =
        new CallableParameterUsageStatementsGenerator(
          this.constructorDeclaration.parameters,
          'max'
        ).generate().usageStatement ?? '';
      const genericTypeParameters =
        new GenericTypeParameterUsageStatementsGenerator(
          this.classDeclaration.typeParameters
        ).generate().usageStatement ?? '';
      const callableSymbol = `new ${className}${genericTypeParameters}`;
      const minParameterCallWithReturnValue = `${callableSymbol}(${minParameterUsage});`;
      const maxParameterCall = `${callableSymbol}(${maxParameterUsage});`;

      let usageStatement = `const ${usageFunctionName} = ${usageFunctionGenericParametersDeclaration}(${usageFunctionParameterDeclaration}) => {${EOL}`;
      usageStatement += `${indent(minParameterCallWithReturnValue)}${EOL}`;
      usageStatement += `${indent(maxParameterCall)}${EOL}`;
      usageStatement += `}${EOL}`;
      return { usageStatement };
    };

  /**
   * Generates usage snippets for abstract class constructor.
   * Generated snippets have an attempt to derive from abstract class
   * and call it's constructor via super() call with matching list of parameters.
   */
  private generateAbstractClassConstructorUsage =
    (): UsageStatementsGeneratorOutput => {
      const className = this.classDeclaration.name?.getText();
      if (!className) {
        throw new Error('Class name is missing');
      }
      const derivedClassConstructorParameterUsage =
        new CallableParameterUsageStatementsGenerator(
          this.constructorDeclaration.parameters,
          // exploring just max is fine as abstract and derived class ctor
          // signatures match
          'max'
        ).generate().usageStatement ?? '';
      const derivedClassGenericParametersDeclaration =
        new GenericTypeParameterDeclarationUsageStatementsGenerator(
          this.classDeclaration.typeParameters
        ).generate().usageStatement ?? '';
      const genericTypeParameters =
        new GenericTypeParameterUsageStatementsGenerator(
          this.classDeclaration.typeParameters
        ).generate().usageStatement ?? '';
      const derivedClassName = `${className}DerivedUsageClass`;
      const constructorDeclaration = this.constructorDeclaration
        .getText()
        // Strip trailing ';' as we want to define body.
        .replace(';', '');
      const superConstructorCall = `super(${derivedClassConstructorParameterUsage});`;
      let usageStatement = `class ${derivedClassName}${derivedClassGenericParametersDeclaration} extends ${className}${genericTypeParameters}{${EOL}`;
      usageStatement += `${indent(constructorDeclaration)} {${EOL}`;
      usageStatement += `${indent(indent(superConstructorCall))}${EOL}`;
      usageStatement += `${indent('}')}${EOL}`;
      usageStatement += `}${EOL}`;
      return { usageStatement };
    };
}

/**
 * Generates usage snippets for class inheritance.
 * Generated snippets attempt to use a reference typed with class (provided via usage function parameter)
 * and assign it to local constant that is typed with super type from extend or implement clauses.
 */
class ClassInheritanceUsageStatementsGenerator
  implements UsageStatementsGenerator
{
  constructor(
    private readonly classDeclaration: ts.ClassDeclaration,
    private readonly heritageClauses: ts.NodeArray<ts.HeritageClause>
  ) {}

  generate = (): UsageStatementsGeneratorOutput => {
    const className = this.classDeclaration.name?.getText();
    if (!className) {
      throw new Error('Class name is missing');
    }
    const usageFunctionName = toLowerCamelCase(
      `${className}InheritanceUsageFunction`
    );
    const usageFunctionParameterName = `${usageFunctionName}Parameter`;
    const genericTypeParametersDeclaration =
      new GenericTypeParameterDeclarationUsageStatementsGenerator(
        this.classDeclaration.typeParameters
      ).generate().usageStatement ?? '';
    const genericTypeParameters =
      new GenericTypeParameterUsageStatementsGenerator(
        this.classDeclaration.typeParameters
      ).generate().usageStatement ?? '';

    const superTypeUsageStatements = this.heritageClauses
      .flatMap((clause) => clause.types)
      .map((superType, index) => {
        return `const superTypeUsageConst${index}: ${superType.getText()} = ${usageFunctionParameterName};`;
      });

    let usageStatement = '';
    usageStatement += `const ${usageFunctionName} = ${genericTypeParametersDeclaration}(${usageFunctionParameterName}: ${className}${genericTypeParameters}) => {${EOL}`;
    for (const superTypeUsageStatement of superTypeUsageStatements) {
      usageStatement += `${indent(superTypeUsageStatement)}${EOL}`;
    }
    usageStatement += `}${EOL}`;
    return { usageStatement };
  };
}

/**
 * Generates usage of a variable/const/arrow function declared as top level export
 * , i.e. 'const someConst = ...`;
 *
 * TODO this handles functions for now, add variable/const.
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
  generate = (): UsageStatementsGeneratorOutput => {
    if (this.variableStatement.declarationList.declarations.length != 1) {
      throw new Error('Unexpected variable declarations count');
    }
    const variableDeclaration =
      this.variableStatement.declarationList.declarations[0];
    const variableName = variableDeclaration.name.getText();
    let usageStatement: string | undefined;
    if (variableDeclaration.type?.kind === ts.SyntaxKind.FunctionType) {
      usageStatement = new CallableUsageStatementsGenerator(
        variableDeclaration.type as ts.FunctionTypeNode,
        variableName,
        `${variableName}UsageFunction`
      ).generate().usageStatement;
    }

    if (usageStatement) {
      usageStatement += EOL;
    }

    return {
      symbolDescriptor: {
        symbolName: variableName,
      },
      usageStatement,
    };
  };
}

/**
 * Generates usage of a callable statement like function, constructor, class method.
 *
 * For example for function defined as:
 *
 * export const someFunction: (param1: string, param2?: number) => string;
 *
 * it generates the following
 *
 * import { someFunction } from 'samplePackageName';
 *
 * const someFunctionUsageFunction = (param1: string, param2?: number) => {
 *     const returnValue: string = someFunction(param1);
 *     someFunction(param1, param2);
 * }
 */
export class CallableUsageStatementsGenerator
  implements UsageStatementsGenerator
{
  /**
   * @inheritDoc
   */
  constructor(
    private readonly functionType: ts.FunctionTypeNode,
    private readonly callableSymbol: string,
    private readonly usageFunctionName: string
  ) {}
  generate = (): UsageStatementsGeneratorOutput => {
    const usageFunctionParameterDeclaration =
      new CallableParameterDeclarationUsageStatementsGenerator(
        this.functionType.parameters
      ).generate().usageStatement ?? '';
    const usageFunctionGenericParametersDeclaration =
      new GenericTypeParameterDeclarationUsageStatementsGenerator(
        this.functionType.typeParameters
      ).generate().usageStatement ?? '';
    let returnValueAssignmentTarget = '';
    if (this.functionType.type.kind !== ts.SyntaxKind.VoidKeyword) {
      let returnType;
      if (this.functionType.type.kind === ts.SyntaxKind.TypePredicate) {
        // Example type predicate looks like this
        // '(input: unknown) => input is SampleType;'
        // It's a special syntax that tells compiler that it's safe to assume
        // type after invoking the check.
        // But when it comes to value assignment this is treated as boolean.
        returnType = 'boolean';
      } else {
        returnType = this.functionType.type.getText();
      }
      returnValueAssignmentTarget = `const returnValue: ${returnType} = `;
    }
    const minParameterUsage =
      new CallableParameterUsageStatementsGenerator(
        this.functionType.parameters,
        'min'
      ).generate().usageStatement ?? '';
    const maxParameterUsage =
      new CallableParameterUsageStatementsGenerator(
        this.functionType.parameters,
        'max'
      ).generate().usageStatement ?? '';
    const minParameterCallWithReturnValue = `${returnValueAssignmentTarget}${this.callableSymbol}(${minParameterUsage});`;
    const maxParameterCall = `${this.callableSymbol}(${maxParameterUsage});`;
    let usageStatement = `const ${this.usageFunctionName} = ${usageFunctionGenericParametersDeclaration}(${usageFunctionParameterDeclaration}) => {${EOL}`;
    usageStatement += `${indent(minParameterCallWithReturnValue)}${EOL}`;
    usageStatement += `${indent(maxParameterCall)}${EOL}`;
    usageStatement += `}`;
    return { usageStatement };
  };
}
/**
 * Generates a parameter declaration for a callable statement.
 *
 * For example when generating function usage statement:
 * const someFunctionUsageFunction = (<code from this generator goes here>) => {
 * }
 */
export class CallableParameterDeclarationUsageStatementsGenerator
  implements UsageStatementsGenerator
{
  /**
   * @inheritDoc
   */
  constructor(
    private readonly parameters: ts.NodeArray<ts.ParameterDeclaration>
  ) {}
  generate = (): UsageStatementsGeneratorOutput => {
    const usageStatement = this.parameters
      .map((parameter) => parameter.getText())
      .join(', ');
    return {
      usageStatement,
    };
  };
}

/**
 * Generates parameter usage of a callable statement.
 *
 * For example in function usage statement:
 * const someFunctionUsageFunction = (param1: string, param2?: number) => {
 *     const returnValue: string = someFunction(<code from this generator goes here>);
 *     someFunction(<code from this generator goes here>);
 * }
 */
export class CallableParameterUsageStatementsGenerator
  implements UsageStatementsGenerator
{
  /**
   * @inheritDoc
   */
  constructor(
    private readonly parameters: ts.NodeArray<ts.ParameterDeclaration>,
    private readonly strategy: 'min' | 'max'
  ) {}
  generate = (): UsageStatementsGeneratorOutput => {
    const usageStatement = this.parameters
      .filter((parameter) => {
        switch (this.strategy) {
          case 'min':
            return (
              parameter.questionToken === undefined &&
              parameter.initializer === undefined
            );
          case 'max':
            return true;
        }
      })
      .map((parameter) => {
        if (parameter.dotDotDotToken) {
          // expand var arg
          return `...${parameter.name.getText()}`;
        }
        return parameter.name.getText();
      })
      .join(', ');
    return {
      usageStatement,
    };
  };
}

const toLowerCamelCase = (name: string): string => {
  return `${name?.substring(0, 1).toLowerCase()}${name?.substring(1)}`;
};

const toPascalCase = (name: string): string => {
  return `${name?.substring(0, 1).toUpperCase()}${name?.substring(1)}`;
};

const indent = (snippet: string): string => {
  return snippet
    .split(EOL)
    .map((line) => `  ${line}`)
    .join(EOL);
};
