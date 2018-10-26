import * as fs from 'fs';
import { sortBy } from 'sort-by-typescript';
import * as tablemark from 'tablemark';

const Benchmark = require('benchmark');
const suite = new Benchmark.Suite('Sørensen–Dice coefficient');

const libraries = {
	'string-similarity': require('string-similarity').compareTwoStrings,
	natural: require('natural').DiceCoefficient,
	'dice-coefficient': require('dice-coefficient'),
	'string-similarity-js': require('string-similarity-js').stringSimilarity,
	'kor-string-similarity': require('kor-string-similarity').compareTwoStrings,
	'dice-similarity-coeff': require('dice-similarity-coeff').twoStrings,
};

const testPairs = [
	['a', 'b'],
	['ab', 'ac'],
	['ac', 'bc'],
	['abc', 'axc'],
	['kitten', 'sitting'],
	['xabxcdxxefxgx', '1ab2cd34ef5g6'],
	['cat', 'cow'],
	['xabxcdxxefxgx', 'abcdefg'],
	['javawasneat', 'scalaisgreat'],
	['example', 'samples'],
	['sturgeon', 'urgently'],
	['levenshtein', 'frankenstein'],
	['distance', 'difference'],
	['因為我是中國人所以我會說中文', '因為我是英國人所以我會說英文'],
];

console.log('\r\n\r\nBenchmark Started\r\n');

interface ILibraryResult {
	name: string;
	results: number[];
}

const comparisonResults: ILibraryResult[] = [];

Object.keys(libraries).forEach(name => {
	const fn: Function = libraries[name].default || libraries[name];

	const libraryResults: ILibraryResult = {
		name,
		results: testPairs.map(pair => fn(pair[0], pair[1])),
	};

	comparisonResults.push(libraryResults);

	suite.add(name, {
		minSamples: 200,
		fn: () => {
			// from https://github.com/sindresorhus/leven/blob/master/bench.js
			testPairs.forEach(pair => fn(pair[0], pair[1]));
		},
	});
});

interface IBenchmarkResult {
	name: string;
	'ops/sec': number;
	passing?: string;
}

const results: IBenchmarkResult[] = [];

suite.on('cycle', event => {
	const target = event.target;
	results.push({
		name: target.name,
		'ops/sec': Math.round(target.hz),
	});

	console.log(String(event.target));
});

suite.on('complete', () => {
	fs.readFile(`${process.cwd()}/src/_README-template.md`, 'utf8', (error, data) => {
		if (error) {
			console.log(error);
		} else {
			const sortedResults = results.sort(sortBy('-ops/sec'));
			const sortedLibraries = sortedResults.map(result => result.name);
			const sortedComparisonResults = comparisonResults.sort((a, b) => sortedLibraries.indexOf(a.name) - sortedLibraries.indexOf(b.name));

			const mostCommonResults: number[] = [];

			const testResults = testPairs.map((pair, index) => {
				const pairResult = {
					strings: JSON.stringify(pair),
				};

				const mostCommonResult = mode(comparisonResults.map(result => result.results[index]));
				mostCommonResults.push(mostCommonResult);

				sortedComparisonResults.forEach(result => {
					const score = result.results[index];
					pairResult[result.name] = `${score} ${score === mostCommonResult ? '✅' : '❌'}`;
				});

				return pairResult;
			});

			sortedResults.forEach((result, index) => {
				const testsPassed = sortedComparisonResults[index].results.map(
					(sortedResult, resultIndex) => mostCommonResults[resultIndex] === sortedResult
				);

				result.passing = !testsPassed.includes(false) ? '✅' : '❌';
			});

			const markdownTable = tablemark(sortedResults, {
				columns: ['Name', 'Operations per second', 'All results correct'],
			});
			const scoresTable = tablemark(testResults);

			const newFileDat = data
				.replace('{benchmark_table}', markdownTable.substr(0, markdownTable.length - 1))
				.replace('{scores_table}', scoresTable.substr(0, scoresTable.length - 1));

			fs.writeFile(`${process.cwd()}/README.md`, newFileDat, 'utf8', () => {});
		}
	});
});

suite.run({ async: true });

function mode(array: any[]): number {
	return array.sort((a, b) => array.filter(v => v === a).length - array.filter(v => v === b).length).pop();
}
