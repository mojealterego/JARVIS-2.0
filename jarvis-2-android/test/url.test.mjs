import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeApiUrl } from '../lib/url.ts';

test('public servers require HTTPS, including hostnames resembling private addresses', () => {
  for (const host of ['example.com', '10.example.com', '127.attacker.example', '192.168.attacker.example', '172.16.attacker.example', 'localhost.attacker.example', '172.15.0.1', '172.32.0.1', '192.169.1.1', '[2001:db8::1]']) {
    assert.throws(() => normalizeApiUrl('http://' + host + ':8787'), /HTTPS/, host);
  }
  assert.equal(normalizeApiUrl('  https://example.com/api/  '), 'https://example.com/api');
});

test('local development supports private IPv4 and explicit loopback hosts', () => {
  for (const host of ['10.0.2.2', '127.0.0.1', '192.168.1.10', '172.16.0.1', '172.31.255.254', 'localhost', '[::1]']) {
    assert.equal(normalizeApiUrl('http://' + host + ':8787/'), 'http://' + host + ':8787');
  }
});

test('connection URLs reject embedded credentials, query data, fragments and other protocols', () => {
  for (const url of ['not a URL', 'ftp://example.com', 'file:///tmp/file', 'https://user:secret@example.com', 'https://example.com?token=secret', 'https://example.com#fragment']) {
    assert.throws(() => normalizeApiUrl(url), undefined, url);
  }
});
