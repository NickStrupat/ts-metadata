import { Project, ClassDeclaration } from "ts-morph";
import fs from "fs";
import path from "path";

const metadataSourceFilename = 'metadata.ts';
const outputSourceFilename = 'metadata.generated.ts';

// copy base metadata file to current working directory
//fs.copyFileSync(`${__dirname}/${metadataSourceFilename}`, `${process.cwd()}/${metadataSourceFilename}`);

const thisFilename = path.basename(__filename);
console.log(thisFilename);
process.exit();

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
	skipFileDependencyResolution: true,
	addFilesFromTsConfig: false
});

class Import {
	constructor(
		public classNames: string[],
		public modulePath: string,
	) {}
}

class ClassInfo {
	constructor(
		public readonly name: string,
		public readonly properties: PropertyInfo[]
	) {}
}

class PropertyInfo {
	constructor(
		public readonly name: string,
		public readonly classes: ClassInfo[]
	) {}
}

const imports = new Array<Import>();
const classInfos = new Array<ClassInfo>();

function isString(stringOrUndefined: string | undefined): stringOrUndefined is string { return stringOrUndefined !== undefined }

for (let sourceFile of project.getSourceFiles()) {
	if (sourceFile.getBaseName() === outputSourceFilename || sourceFile.getBaseName() === thisFilename || sourceFile.getBaseName() === 'metadata.ts')
		continue;
	const exportedClasses = new Array<ClassDeclaration>();
	for (let class_ of sourceFile.getClasses())
		if (class_.isNamedExport())
			exportedClasses.push(class_);
	if (exportedClasses.length === 0)
		continue;

	const exportedClassNames = exportedClasses.map(x => x.getName()).filter(isString);
	const modulePath = `./${sourceFile.getBaseNameWithoutExtension()}`;

	imports.push(new Import(exportedClassNames, modulePath));
	for (let exportedClass of exportedClasses) {
		const name = exportedClass.getName();
		if (!isString(name))
			continue;
		const propertyInfos = new Array<PropertyInfo>();
		for (let property of exportedClass.getProperties()) {
			//console.log(JSON.stringify(property));
			propertyInfos.push(new PropertyInfo(property.getName(), []));
		}
		classInfos.push(new ClassInfo(name, propertyInfos));
	}

	const importStatement = `import { ${exportedClassNames.join(', ')} } from '${modulePath}'`;
	metadataSourceFile.addStatements(importStatement);
	
	metadataSourceFile.addStatements(`declare module "${modulePath}" {`);
	for (let c of exportedClasses)
		metadataSourceFile.addStatements(`\tinterface ${c.getName()} { $classInfo: ClassInfo; }`);
	metadataSourceFile.addStatements(`}`);

	// TODO: static property metadata

	for (let c of exportedClasses) {
		metadataSourceFile.addStatements(`${c.getName()}.prototype.$classInfo = new ClassInfo('${c.getName()}', [`);
		for (let constructor of c.getConstructors()) {
			for (let parameter of constructor.getParameters().filter(x => x.isParameterProperty())) {
				// const parameterType = parameter.getType();
				// for (let key in parameterType)
				// 	console.log(key);
				const parameterTypes = parameter.getType().getText();
				metadataSourceFile.addStatements(`\tnew PropertyInfo('${parameter.getName()}', ['${parameterTypes}']),`);
			}
		}
		for (let p of c.getProperties().filter(x => !x.isStatic()))
		{
			const propertyTypes = p.getType().getText();
			metadataSourceFile.addStatements(`\tnew PropertyInfo('${p.getName()}', ['${propertyTypes}']),`);
		}
		metadataSourceFile.addStatements(`]);`);
	}
}

metadataProject.saveSync();