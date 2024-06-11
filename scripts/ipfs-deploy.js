#!/usr/bin/env node

async function deployToIPFS() {
  const { resolve } = await import('path');
  const { create } = await import("kubo-rpc-client");
  const { base32 } = await import("multiformats/bases/base32");
  const kubo = create({ url: "http://127.0.0.1:5001/api/v0" });

  // Resolve the absolute path of the dist folder
  const distPath = resolve(__dirname, '../dist/');
  console.log('distPath', distPath)

  try {
    // Add the dist folder to IPFS
    const added = await kubo.add({ path: distPath, recursive: true });
    console.log('added', added)
    console.log('Added dist folder to IPFS with CID:', added.cid.toV1().toString(base32));

    // Pin the dist folder
    await kubo.pin.add(added.cid)
    console.log('Pinned dist folder on IPFS with CID:', added.cid.toV1().toString(base32));
  } catch (error) {
    console.error('Error deploying to IPFS:', error);
  }
}

deployToIPFS();
