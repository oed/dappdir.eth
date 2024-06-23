## Best Practices

Below are some high level guidelines for building and deploying dapps. These are not exhaustive, but they should provide a decent starting point.

### Building and deploying

There are three steps to building and deploying a dapp:

1. **Make a static build of your webapp.** A static web application is a web application that can be delivered directly to an end user's browser without any server-side alteration of the HTML, CSS, or JavaScript content.

2. **Deploy your static build to IPFS.** Assuming your build is in the `./dist` directory, you can deploy it to IPFS with the following command:
   ```
   $ ipfs add -r --cid-version=1 --pin=true ./dist
   ```

3. **Use the CID (IPFS hash) from step (2) to set the `contentHash` record on your ENS domain.** Remember that you need to format the `contentHash` string as `ipfs://cid`.

### Optimizing distribution purity

When any page of your app is loaded, you need to make sure that all resources (like scripts or media) are loaded from the same origin as the page, e.g., they are part of the `./dist` directory that you added to IPFS. Generally, you want to look out for anything inside of tags like `<script>`, `<link>`, `<img>`, `<iframe>`, `<source>`, etc.
