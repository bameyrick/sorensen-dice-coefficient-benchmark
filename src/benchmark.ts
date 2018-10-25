import * as fs from 'fs';
import { sortBy } from 'sort-by-typescript';
import * as tablemark from 'tablemark';

const Benchmark = require('benchmark');
const suite = new Benchmark.Suite();

const libraries = {
	'string-similarity': require('string-similarity').compareTwoStrings,
	natural: require('natural').DiceCoefficient,
	'dice-coefficient': require('dice-coefficient'),
	'string-similarity-js': require('string-similarity-js').stringSimilarity,
	'kor-string-similarity': require('kor-string-similarity').compareTwoStrings,
	'dice-similarity-coeff': require('dice-similarity-coeff').twoStrings,
};

console.log('\r\n\r\nBenchmark Started\r\n');

Object.keys(libraries).forEach(name => {
	const fn = libraries[name].default || libraries[name];

	suite.add(name, () => {
		// from https://github.com/sindresorhus/leven/blob/master/bench.js
		fn('a', 'b');
		fn('ab', 'ac');
		fn('ac', 'bc');
		fn('abc', 'axc');
		fn('kitten', 'sitting');
		fn('xabxcdxxefxgx', '1ab2cd34ef5g6');
		fn('cat', 'cow');
		fn('xabxcdxxefxgx', 'abcdefg');
		fn('javawasneat', 'scalaisgreat');
		fn('example', 'samples');
		fn('sturgeon', 'urgently');
		fn('levenshtein', 'frankenstein');
		fn('distance', 'difference');
		fn('因為我是中國人所以我會說中文', '因為我是英國人所以我會說英文');
	});
});

interface IBenchmarkResult {
	name: string;
	'ops/sec': number;
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
			const markdownTable = tablemark(sortedResults, {
				columns: ['Name', 'Operations per second'],
			});
			const newFileDat = data.replace('{table}', markdownTable.substr(0, markdownTable.length - 1));

			fs.writeFile(`${process.cwd()}/README.md`, newFileDat, 'utf8', () => {});
		}
	});
});

suite.run({ async: true });
