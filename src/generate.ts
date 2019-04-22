import { Project, ClassDeclaration } from "ts-morph";
import { TypeInfo } from "./type-info";
import * as fs from "fs";
import * as path from "path";

console.log(process.cwd());

const metadataSourceFilename = 'metadata.ts';
const typeInfoSourceFilename = 'type-info.ts';
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

class Module {
	constructor(
		public filePath: string,
		public typeInfos: Array<TypeInfo>,
	) {}
}

const modules = new Array<Module>();

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
	const sourceFilePath = sourceFile.getFilePath();
	const extension = path.extname(sourceFilePath);
	const modulePath = `.${sourceFilePath.substring(process.cwd().length, sourceFilePath.length - extension.length)}`;

	modules.push(new Module(sourceFilePath, exportedClassNames.map(name => new TypeInfo(name))));

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
		//typeInfos.push(new TypeInfo(name));
	}
}

console.log(modules);

if (modules.length !== 0 && modules.reduce((cur, next) => cur + next.typeInfos.length, 0) !== 0) {
	const os = fs.createWriteStream(outputSourceFilename);
	
	os.write(`import { TypeInfo } from './type-info'\n\n`);
	for (let i = 0; i !== modules.length; ++i) {
		const sourceFilePath = modules[i].filePath;
		const extension = path.extname(sourceFilePath);
		const modulePath = `.${sourceFilePath.substring(process.cwd().length, sourceFilePath.length - extension.length)}`;
		os.write(`import * as module${i + 1} from '${modulePath}';\n`);
	}

	os.write(`\nexport function addGeneratedMetadata(table: Map<any, TypeInfo>): void {\n`);
	for (let i = 0; i !== modules.length; ++i) {
		for (let typeInfo of modules[i].typeInfos) {
			os.write(`\ttable.set(module${i + 1}.${typeInfo.name}.prototype, new TypeInfo("${typeInfo.name}"));\n`);
		}
	}
	os.write(`}`);
	fs.copyFileSync(path.join(__dirname, metadataSourceFilename), metadataSourceFilename);
	fs.copyFileSync(path.join(__dirname, typeInfoSourceFilename), typeInfoSourceFilename);
}