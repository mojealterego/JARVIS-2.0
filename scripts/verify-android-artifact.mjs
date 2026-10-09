import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const info = JSON.parse(await readFile('build-info.json', 'utf8'));
assert.equal(info.commit, process.env.SOURCE_SHA, 'Source commit does not match the build run');
const badging = await readFile('apk-info.txt', 'utf8');
const manifest = await readFile('manifest-tree.txt', 'utf8');
const packageLine = badging.split('\n').find(line => line.startsWith('package:'));
assert.ok(packageLine, 'Android package metadata is missing');
const attributes = Object.fromEntries([...packageLine.matchAll(/\b(name|versionCode|versionName)='([^']*)'/g)].map(match => [match[1], match[2]]));
assert.equal(attributes.name, process.env.EXPECTED_PACKAGE, 'Unexpected Android package');
assert.equal(attributes.versionName, process.env.EXPECTED_VERSION, 'Unexpected app version');
assert.equal(attributes.versionCode, process.env.EXPECTED_VERSION_CODE, 'Unexpected Android version code');
assert.match(badging, /uses-permission: name='android.permission.RECORD_AUDIO'/, 'Microphone permission is missing');
assert.match(manifest, /android:allowBackup[^=\n]*=\(type 0x12\)0x0+(?:\s|$)/m, 'Android backup must be disabled');
assert.match(manifest, /android:usesCleartextTraffic[^=\n]*=\(type 0x12\)0xffffffff(?:\s|$)/m, 'Local development HTTP must be enabled');
const apk = await readFile('JARVIS-2.0-preview.apk');
const report = {
  package: attributes.name, version: attributes.versionName, versionCode: attributes.versionCode,
  sourceCommit: info.commit, buildId: info.buildId ?? null, signing: info.signing,
  apkBytes: apk.length, apkSha256: createHash('sha256').update(apk).digest('hex'),
  checks: ['SHA256 manifest', 'Android signature', 'source commit', 'package and version', 'microphone permission', 'backup disabled', 'local HTTP configuration']
};
await writeFile('verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
