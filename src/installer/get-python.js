/**
 * Copyright (c) 2017-present PlatformIO <contact@platformio.org>
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import * as core from '../core';
import * as proc from '../proc';
import { callInstallerScript } from './get-pioarduino';
import fs from 'fs';
import got from 'got';
import path from 'path';
import { promisify } from 'util';
import semver from 'semver';
import stream from 'stream';
import zlib from 'zlib';
import { decompress } from 'fzstd';
const tar = require('tar');

// Embedded SSL certificates for secure HTTPS connections
const HTTPS_CA_CERTIFICATES = `
# Issuer: CN=ISRG Root X1 O=Internet Security Research Group
# Subject: CN=ISRG Root X1 O=Internet Security Research Group
# Label: "ISRG Root X1"
# Serial: 172886928669790476064670243504169061120
# MD5 Fingerprint: 0c:d2:f9:e0:da:17:73:e9:ed:86:4d:a5:e3:70:e7:4e
# SHA1 Fingerprint: ca:bd:2a:79:a1:07:6a:31:f2:1d:25:36:35:cb:03:9d:43:29:a5:e8
# SHA256 Fingerprint: 96:bc:ec:06:26:49:76:f3:74:60:77:9a:cf:28:c5:a7:cf:e8:a3:c0:aa:e1:1a:8f:fc:ee:05:c0:bd:df:08:c6
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----

# Issuer: CN=USERTrust RSA Certification Authority O=The USERTRUST Network
# Subject: CN=USERTrust RSA Certification Authority O=The USERTRUST Network
# Label: "USERTrust RSA Certification Authority"
# Serial: 2645093764781058787591871645665788717
# MD5 Fingerprint: 1b:fe:69:d1:91:b7:19:33:a3:72:a8:0f:e1:55:e5:b5
# SHA1 Fingerprint: 2b:8f:1b:57:33:0d:bb:a2:d0:7a:6c:51:f7:0e:e9:0d:da:b9:ad:8e
# SHA256 Fingerprint: e7:93:c9:b0:2f:d8:aa:13:e2:1c:31:22:8a:cc:b0:81:19:64:3b:74:9c:89:89:64:b1:74:6d:46:c3:d4:cb:d2
-----BEGIN CERTIFICATE-----
MIIF3jCCA8agAwIBAgIQAf1tMPyjylGoG7xkDjUDLTANBgkqhkiG9w0BAQwFADCB
iDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCk5ldyBKZXJzZXkxFDASBgNVBAcTC0pl
cnNleSBDaXR5MR4wHAYDVQQKExVUaGUgVVNFUlRSVVNUIE5ldHdvcmsxLjAsBgNV
BAMTJVVTRVJUcnVzdCBSU0EgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkwHhcNMTAw
MjAxMDAwMDAwWhcNMzgwMTE4MjM1OTU5WjCBiDELMAkGA1UEBhMCVVMxEzARBgNV
BAgTCk5ldyBKZXJzZXkxFDASBgNVBAcTC0plcnNleSBDaXR5MR4wHAYDVQQKExVU
aGUgVVNFUlRSVVNUIE5ldHdvcmsxLjAsBgNVBAMTJVVTRVJUcnVzdCBSU0EgQ2Vy
dGlmaWNhdGlvbiBBdXRob3JpdHkwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIK
AoICAQCAEmUXNg7D2wiz0KxXDXbtzSfTTK1Qg2HiqiBNCS1kCdzOiZ/MPans9s/B
3PHTsdZ7NygRK0faOca8Ohm0X6a9fZ2jY0K2dvKpOyuR+OJv0OwWIJAJPuLodMkY
tJHUYmTbf6MG8YgYapAiPLz+E/CHFHv25B+O1ORRxhFnRghRy4YUVD+8M/5+bJz/
Fp0YvVGONaanZshyZ9shZrHUm3gDwFA66Mzw3LyeTP6vBZY1H1dat//O+T23LLb2
VN3I5xI6Ta5MirdcmrS3ID3KfyI0rn47aGYBROcBTkZTmzNg95S+UzeQc0PzMsNT
79uq/nROacdrjGCT3sTHDN/hMq7MkztReJVni+49Vv4M0GkPGw/zJSZrM233bkf6
c0Plfg6lZrEpfDKEY1WJxA3Bk1QwGROs0303p+tdOmw1XNtB1xLaqUkL39iAigmT
Yo61Zs8liM2EuLE/pDkP2QKe6xJMlXzzawWpXhaDzLhn4ugTncxbgtNMs+1b/97l
c6wjOy0AvzVVdAlJ2ElYGn+SNuZRkg7zJn0cTRe8yexDJtC/QV9AqURE9JnnV4ee
UB9XVKg+/XRjL7FQZQnmWEIuQxpMtPAlR1n6BB6T1CZGSlCBst6+eLf8ZxXhyVeE
Hg9j1uliutZfVS7qXMYoCAQlObgOK6nyTJccBz8NUvXt7y+CDwIDAQABo0IwQDAd
BgNVHQ4EFgQUU3m/WqorSs9UgOHYm8Cd8rIDZsswDgYDVR0PAQH/BAQDAgEGMA8G
A1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQEMBQADggIBAFzUfA3P9wF9QZllDHPF
Up/L+M+ZBn8b2kMVn54CVVeWFPFSPCeHlCjtHzoBN6J2/FNQwISbxmtOuowhT6KO
VWKR82kV2LyI48SqC/3vqOlLVSoGIG1VeCkZ7l8wXEskEVX/JJpuXior7gtNn3/3
ATiUFJVDBwn7YKnuHKsSjKCaXqeYalltiz8I+8jRRa8YFWSQEg9zKC7F4iRO/Fjs
8PRF/iKz6y+O0tlFYQXBl2+odnKPi4w2r78NBc5xjeambx9spnFixdjQg3IM8WcR
iQycE0xyNN+81XHfqnHd4blsjDwSXWXavVcStkNr/+XeTWYRUc+ZruwXtuhxkYze
Sf7dNXGiFSeUHM9h4ya7b6NnJSFd5t0dCy5oGzuCr+yDZ4XUmFF0sbmZgIn/f3gZ
XHlKYC6SQK5MNyosycdiyA5d9zZbyuAlJQG03RoHnHcAP9Dc1ew91Pq7P8yF1m9/
qS3fuQL39ZeatTXaw2ewh0qpKJ4jjv9cJ2vhsE/zB+4ALtRZh8tSQZXq9EfX7mRB
VXyNWQKV3WKdwrnuWih0hKWbt5DHDAff9Yk2dDLWKMGwsAvgnEzDHNb842m1R0aB
L6KCq9NjRHDEjf8tM7qtj3u1cIiuPhnPQCjY/MiQu12ZIvVS5ljFH4gxQ+6IHdfG
jjxDah2nGN59PRbxYvnKkKj9
-----END CERTIFICATE-----
`;

// Cache for parsed release data to avoid repeated API calls
let cachedReleaseData = null;
const RELEASE_CACHE_TTL = 300000; // 5 minutes
let releaseCacheTime = 0;

// Pre-compiled regex for better performance
const ASSET_NAME_REGEX = /^cpython-(\d+\.\d+\.\d+)\+(\d+)-([^-]+)-([^-]+)-([^-]+)(?:-([^-]+))?(?:-([^.]+))?\.(tar\.(?:gz|zst))$/;

/**
 * Search for existing Python executable in system PATH with version validation
 * Only accepts Python versions 3.10 through 3.13
 * @returns {Promise<string|null>} Path to Python executable or null if not found
 */
export async function findPythonExecutable() {
  const exenames = proc.IS_WINDOWS ? ['python.exe'] : ['python3', 'python'];
  const envPath = process.env.PLATFORMIO_PATH || process.env.PATH;
  const errors = [];
  
  // Search through all PATH locations for Python executables
  for (const location of envPath.split(path.delimiter)) {
    for (const exename of exenames) {
      const executable = path.normalize(path.join(location, exename)).replace(/"/g, '');
      try {
        if (fs.existsSync(executable) && 
            (await isValidPythonVersion(executable)) &&
            (await callInstallerScript(executable, ['check', 'python']))) {
          return executable;
        }
      } catch (err) {
        console.warn(executable, err);
        errors.push(err);
      }
    }
  }
  
  // Check for specific distutils module error
  for (const err of errors) {
    if (err.toString().includes('Could not find distutils module')) {
      throw err;
    }
  }
  return null;
}

/**
 * Check if Python executable has acceptable version (3.10-3.13)
 * @param {string} executable - Path to Python executable
 * @returns {Promise<boolean>} True if version is acceptable
 */
async function isValidPythonVersion(executable) {
  try {
    const { execSync } = require('child_process');
    const output = execSync(`"${executable}" --version`, {
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    const versionMatch = output.match(/Python (\d+\.\d+\.\d+)/);
    if (!versionMatch) return false;
    
    const version = versionMatch[1];
    return semver.gte(version, '3.10.0') && semver.lt(version, '3.14.0');
  } catch {
    return false;
  }
}

/**
 * Verify that Python executable exists in the installed directory
 * @param {string} pythonDir - Directory containing Python installation
 * @returns {Promise<boolean>} True if executable exists
 */
async function ensurePythonExeExists(pythonDir) {
  const binDir = proc.IS_WINDOWS ? pythonDir : path.join(pythonDir, 'bin');
  const executables = ['python.exe', 'python3', 'python'];
  
  for (const name of executables) {
    try {
      await fs.promises.access(path.join(binDir, name));
      return true;
    } catch (err) {
      // Continue trying other executable names
    }
  }
  throw new Error('Python executable does not exist!');
}

/**
 * Download and install portable Python distribution
 * @param {string} destinationDir - Target installation directory
 * @param {object} options - Optional configuration
 * @returns {Promise<string>} Path to installed Python directory
 */
export async function installPortablePython(destinationDir, options = undefined) {
  const registryFile = await getRegistryFile();
  if (!registryFile) {
    throw new Error(`Could not find portable Python for ${proc.getSysType()}`);
  }
  
  const archivePath = await downloadRegistryFile(
    registryFile,
    core.getTmpDir(),
    options,
  );
  if (!archivePath) {
    throw new Error('Could not download portable Python');
  }
  
  // Clean up existing installation
  try {
    await fs.promises.rm(destinationDir, { recursive: true, force: true });
  } catch (err) {
    console.warn(err);
  }
  
  // Extract archive and verify Python executable
  await extractArchive(archivePath, destinationDir);
  await ensurePythonExeExists(destinationDir);
  return destinationDir;
}

/**
 * Fetch portable Python packages from astral-sh/python-build-standalone with caching
 * @returns {Promise<object|null>} Registry file information or null if not found
 */
async function getRegistryFile() {
  const systype = proc.getSysType();
  const now = Date.now();
  
  // Use cached data if still valid
  if (cachedReleaseData && (now - releaseCacheTime) < RELEASE_CACHE_TTL) {
    return selectBestAsset(cachedReleaseData, systype);
  }
  
  // Load release data from astral-sh/python-build-standalone
  const releaseData = await got(
    'https://api.github.com/repos/astral-sh/python-build-standalone/releases/tags/20250818',
    {
      timeout: 60000,
      retry: { limit: 5 },
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PlatformIO-Python-Installer',
      },
      https: {
        certificateAuthority: HTTPS_CA_CERTIFICATES,
      },
    },
  ).json();

  // Cache the release data
  cachedReleaseData = releaseData;
  releaseCacheTime = now;
  
  return selectBestAsset(releaseData, systype);
}

/**
 * Select the best asset for the given system type
 * @param {object} releaseData - GitHub release data
 * @param {string} systype - Target system type
 * @returns {object|null} Best asset or null if none found
 */
function selectBestAsset(releaseData, systype) {
  // Filter compatible assets with optimized filtering
  const compatibleAssets = releaseData.assets.filter(asset => 
    isAssetCompatible(asset.name, systype)
  );

  if (compatibleAssets.length === 0) {
    return null;
  }

  // Find asset with highest score (most optimized sorting)
  const bestAsset = compatibleAssets.reduce((best, current) => {
    const currentScore = scoreAsset(current.name, systype);
    const bestScore = best ? scoreAsset(best.name, systype) : -1;
    return currentScore > bestScore ? current : best;
  }, null);

  if (!bestAsset) {
    return null;
  }

  // Convert asset to compatible format
  return {
    name: bestAsset.name,
    download_url: bestAsset.browser_download_url,
    size: bestAsset.size,
    system: [systype],
    compression: getCompressionType(bestAsset.name),
  };
}

/**
 * Parse asset filename to extract metadata (optimized with cached regex)
 * @param {string} assetName - Asset filename
 * @returns {object|null} Parsed metadata or null if parsing failed
 */
function parseAssetName(assetName) {
  const match = ASSET_NAME_REGEX.exec(assetName);
  
  if (!match) {
    return null;
  }

  return {
    pythonVersion: match[1],
    buildDate: match[2],
    arch: match[3],
    os: match[4],
    libc: match[5],
    buildVariant: match[6] || '',
    packageType: match[7] || '',
    compression: match[8],
  };
}

/**
 * Check if asset is compatible with target system (optimized version)
 * @param {string} assetName - Asset filename
 * @param {string} systype - Target system type
 * @returns {boolean} True if compatible
 */
function isAssetCompatible(assetName, systype) {
  const parsed = parseAssetName(assetName);
  if (!parsed) {
    return false;
  }

  // Quick Python version check (max 3.13)
  const versionParts = parsed.pythonVersion.split('.');
  const major = parseInt(versionParts[0], 10);
  const minor = parseInt(versionParts[1], 10);
  if (major !== 3 || minor > 13) {
    return false;
  }

  // Exclude unwanted build variants (case-insensitive for performance)
  const buildVariant = parsed.buildVariant;
  if (buildVariant && (
    buildVariant.includes('freethreaded') || 
    buildVariant.includes('debug') ||
    buildVariant.includes('noopt')
  )) {
    return false;
  }

  // System compatibility mapping (optimized lookup)
  const systemMap = getSystemMapping(systype);
  if (!systemMap) {
    return false;
  }

  return parsed.arch === systemMap.arch && 
         parsed.os === systemMap.os && 
         parsed.libc.startsWith(systemMap.libc);
}

/**
 * Get system mapping for architecture compatibility (memoized)
 * @param {string} systype - System type
 * @returns {object|null} System mapping or null if not supported
 */
const systemMappingCache = new Map();
function getSystemMapping(systype) {
  if (systemMappingCache.has(systype)) {
    return systemMappingCache.get(systype);
  }

  const mappings = {
    'darwin-x64': { arch: 'x86_64', os: 'apple', libc: 'darwin' },
    'darwin-arm64': { arch: 'aarch64', os: 'apple', libc: 'darwin' },
    'linux-x64': { arch: 'x86_64', os: 'unknown', libc: 'linux' },
    'linux-arm64': { arch: 'aarch64', os: 'unknown', libc: 'linux' },
    'linux-armv7l': { arch: 'armv7', os: 'unknown', libc: 'linux' },
    'win32-x64': { arch: 'x86_64', os: 'pc', libc: 'windows' },
    'win32-ia32': { arch: 'i686', os: 'pc', libc: 'windows' },
  };

  const mapping = mappings[systype] || null;
  systemMappingCache.set(systype, mapping);
  return mapping;
}

/**
 * Score assets to prefer the best build variant (performance optimized)
 * @param {string} assetName - Asset filename
 * @param {string} systype - Target system type
 * @returns {number} Score (higher is better, -1 if incompatible)
 */
function scoreAsset(assetName, systype) {
  const parsed = parseAssetName(assetName);
  if (!parsed || !isAssetCompatible(assetName, systype)) {
    return -1;
  }

  let score = 0;
  const versionParts = parsed.pythonVersion.split('.');
  const major = parseInt(versionParts[0], 10);
  const minor = parseInt(versionParts[1], 10);
  const patch = parseInt(versionParts[2], 10);

  // Base score from Python version
  score += major * 10000 + minor * 100 + patch;

  // Performance optimization bonuses
  const buildVariant = parsed.buildVariant;
  const packageType = parsed.packageType;
  
  if (buildVariant && (buildVariant.includes('pgo') || buildVariant.includes('lto'))) {
    score += 1000; // Highly prefer optimized builds
  }
  
  if (packageType && packageType.includes('install')) {
    score += 500; // Prefer install-only packages
  }
  
  if (packageType && packageType.includes('stripped')) {
    score += 100; // Prefer stripped binaries
  }

  // Slight preference for tar.gz for maximum compatibility
  if (parsed.compression === 'tar.gz') {
    score += 10;
  }

  return score;
}

/**
 * Determine compression type from filename
 * @param {string} filename - Archive filename
 * @returns {string} Compression type
 */
function getCompressionType(filename) {
  return filename.endsWith('.tar.zst') ? 'zst' : 
         filename.endsWith('.tar.gz') ? 'gzip' : 'unknown';
}

/**
 * Download registry file with optimized streaming
 * @param {object} regfile - Registry file information
 * @param {string} destinationDir - Download destination directory
 * @param {object} options - Optional configuration
 * @returns {Promise<string>} Path to downloaded file
 */
async function downloadRegistryFile(regfile, destinationDir, options = {}) {
  let archivePath;

  // Check for pre-downloaded package
  if (options.predownloadedPackageDir) {
    archivePath = path.join(options.predownloadedPackageDir, regfile.name);
    if (await fileExists(archivePath)) {
      console.info('Using predownloaded package from ' + archivePath);
      return archivePath;
    }
  }

  archivePath = path.join(destinationDir, regfile.name);
  
  // Skip if already downloaded
  if (await fileExists(archivePath)) {
    return archivePath;
  }

  const pipeline = promisify(stream.pipeline);
  
  await pipeline(
    got.stream(regfile.download_url, {
      timeout: { request: 60000 },
      retry: { limit: 5 },
      https: {
        certificateAuthority: HTTPS_CA_CERTIFICATES,
      },
    }),
    fs.createWriteStream(archivePath)
  );
  
  // Verify download completed successfully
  if (!(await fileExists(archivePath))) {
    throw new Error('Failed to download Python archive');
  }
  
  return archivePath;
}

/**
 * Check if file exists (optimized)
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} True if file exists
 */
async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract archive with optimized format detection
 * @param {string} source - Source archive path
 * @param {string} destination - Destination directory
 * @returns {Promise<string>} Destination directory path
 */
async function extractArchive(source, destination) {
  await fs.promises.mkdir(destination, { recursive: true });

  const filename = path.basename(source);
  
  if (filename.endsWith('.tar.zst')) {
    return await extractTarZst(source, destination);
  } else if (filename.endsWith('.tar.gz')) {
    return await extractTarGz(source, destination);
  } else {
    throw new Error(`Unsupported archive format: ${filename}`);
  }
}

/**
 * Extract gzip compressed tar archive (performance optimized)
 * @param {string} source - Source archive path
 * @param {string} destination - Destination directory
 * @returns {Promise<string>} Destination directory path
 */
async function extractTarGz(source, destination) {
  const pipeline = promisify(stream.pipeline);
  
  await pipeline(
    fs.createReadStream(source, { highWaterMark: 64 * 1024 }), // 64KB chunks for better performance
    zlib.createGunzip({ chunkSize: 64 * 1024 }),
    tar.extract({ 
      cwd: destination,
      strip: 0,
      preservePaths: false,
    })
  );
  
  return destination;
}

/**
 * Extract zstandard compressed tar archive using fzstd (performance optimized)
 * @param {string} source - Source archive path
 * @param {string} destination - Destination directory
 * @returns {Promise<string>} Destination directory path
 */
async function extractTarZst(source, destination) {
  // Read and decompress file using fzstd
  const compressedData = await fs.promises.readFile(source);
  const decompressedData = decompress(compressedData);
  
  // Create memory-based stream for tar extraction
  const decompressedStream = stream.Readable.from(decompressedData);
  
  const pipeline = promisify(stream.pipeline);
  
  await pipeline(
    decompressedStream,
    tar.extract({ 
      cwd: destination,
      strip: 0,
      preservePaths: false,
    })
  );
  
  return destination;
}
