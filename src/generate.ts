import { Project, ClassDeclaration } from "ts-morph";
import { TypeInfo } from './metadata'
import * as fs from "fs";
import * as path from "path";

console.log(process.cwd());

// const metadataSourceFilename = 'metadata.ts';
const outputSourceFilename = 'metadata.generated.ts';

// copy base metadata file to current working directory
//fs.copyFileSync(`${__dirname}/${metadataSourceFilename}`, `${process.cwd()}/${metadataSourceFilename}`);

const thisFilename = path.basename(__filename);
console.log(thisFilename);

const project = new Project({
    tsConfigFilePath: path.join(process.cwd(), "tsconfig.json"),
	skipFileDependencyResolution: true,
	//addFilesFromTsConfig: false
});
// project.addExistingSourceFileIfExists('uhoh.ts');

class Import {
	constructor(
		public classNames: string[],
		public modulePath: string,
	) {}
}

const imports = new Array<Import>();
const typeInfos = new Array<TypeInfo>();

function isString(stringOrUndefined: string | undefined): stringOrUndefined is string {
	return stringOrUndefined !== undefined
}
console.log(project.getSourceFiles().length);
for (let sourceFile of project.getSourceFiles()) {
	console.log(sourceFile.getBaseName());
	if (sourceFile.getBaseName() === outputSourceFilename || sourceFile.getBaseName() === thisFilename || sourceFile.getBaseName() === 'metadata.ts')
		continue;
	const exportedClasses = new Array<ClassDeclaration>();
	for (let class_ of sourceFile.getClasses())
		if (class_.isNamedExport())
			exportedClasses.push(class_);
	if (exportedClasses.length === 0)
		continue;

	const exportedClassNames = exportedClasses.map(x => x.getName()).filter(isString);
	const cwdLength = process.cwd().length;
	const sourceFilePath = sourceFile.getFilePath();
	const extension = path.extname(sourceFilePath);
	const relativePath = sourceFilePath.substr(cwdLength);
	console.log("=========");
	console.log(process.cwd());
	console.log(cwdLength);
	console.log(sourceFilePath);
	console.log(extension);
	console.log(relativePath);
	const modulePath = `.${sourceFilePath.substring(cwdLength, sourceFilePath.length - extension.length)}`;

	imports.push(new Import(exportedClassNames, modulePath));
	for (let exportedClass of exportedClasses) {
		const name = exportedClass.getName();
		if (!isString(name))
			continue;
		// const propertyInfos = new Array<PropertyInfo>();
		
		// declared properties
		// for (let property of exportedClass.getProperties()) {
		// 	// propertyInfos.push(new PropertyInfo(property.getName(), []));
		// }

		// properties declared in the constructor parameters
		// for (let constructor of exportedClass.getConstructors()) {
		// 	for (let parameter of constructor.getParameters().filter(x => x.isParameterProperty())) {
		// 		// const parameterTypes = parameter.getType().getText();
		// 		// propertyInfos.push(new PropertyInfo(parameter.getName(), ['${parameterTypes}']));
		// 		// metadataSourceFile.addStatements(`\tnew PropertyInfo('${parameter.getName()}', ['${parameterTypes}']),`);
		// 	}
		// }
		typeInfos.push(new TypeInfo(name));
	}
}

console.log(imports);
console.log(typeInfos);

if (imports.length !== 0 && typeInfos.length !== 0) {
	const os = fs.createWriteStream(outputSourceFilename);
	
	os.write(`import { TypeInfo } from './metadata'\n\n`);
	for (let import_ of imports) {
		os.write(`import { ${import_.classNames.join(", ")} } from '${import_.modulePath}';\n`);
	}

	os.write(`\nexport function addGeneratedMetadata(table: Map<any, TypeInfo>): void {\n`);
	for (let typeInfo of typeInfos) {
		os.write(`\ttable.set(${typeInfo.name}.prototype, new TypeInfo("${typeInfo.name}"));\n`);
	}
	os.write(`}`);
}