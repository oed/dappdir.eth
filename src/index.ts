import './styles.css'
import { createThreePiecePieChart } from './pie-chart'

import { create } from 'kubo-rpc-client'



const kubo = create({ url: "http://127.0.0.1:5001/api/v0" });

const DEFAULT_DAPPS = [
    'dappdir.eth',
    'ipfs.eth',
    'vitalik.eth',
    '1inch.eth',
    'ens.eth',
];

const $dapps = document.querySelector('#dapps')
const $install = document.querySelector('#install')

async function checkKuboAPIOnline() {
    try {
        const version = await kubo.version();
        console.log('Kubo API is online, version:', version.version);
        loadAndDisplayDapps()
    } catch (error) {
        console.error('Kubo API is offline:', error);
        ($install as HTMLElement).style.display = 'block';
    }
}

checkKuboAPIOnline();



import { CID } from 'multiformats/cid';

async function checkIfPinned(ipfsAddress: CID): Promise<boolean> {
    try {
        const pinList = await kubo.pin.ls({ type: 'recursive' });
        for await (const pin of pinList) {
            if (pin.cid.equals(ipfsAddress)) {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error checking if IPFS address is pinned:', error);
        return false;
    }
}
async function togglePin(ipfsAddress: CID, statusElement: HTMLElement): Promise<void> {
    const isCurrentlyPinned = statusElement.textContent === 'Yes';
    try {
        if (isCurrentlyPinned) {
            await kubo.pin.rm(ipfsAddress.toString());
            console.log(`Successfully unpinned address: ${ipfsAddress}`);
        } else {
            await kubo.pin.add(ipfsAddress.toString());
            console.log(`Successfully pinned address: ${ipfsAddress}`);
        }
        // Update the status element to reflect the new pinning status after toggling
        statusElement.textContent = !isCurrentlyPinned ? 'Yes' : 'No';
    } catch (error) {
        console.error(`Error toggling pin on IPFS address: ${ipfsAddress}`, error);
        statusElement.textContent = 'Error';
    }
}

async function handleInput() {
    const submitButton = document.getElementById('submitButton') as HTMLButtonElement;
    submitButton.disabled = true;

    var userInputElement = document.getElementById('textInput') as HTMLInputElement;
    var ensName = userInputElement.value;
    await addDapp(ensName);
    submitButton.disabled = false;
}
async function loadAndDisplayDapps() {
    const storedNames = JSON.parse(localStorage.getItem('resolvedNames') || '[]');
    for (const ensName of storedNames) {
        await addDapp(ensName);
    }
}

async function initializeDefaultNames() {
    let storedNames = JSON.parse(localStorage.getItem('resolvedNames') || '[]');

    for (const name of DEFAULT_DAPPS) {
        if (!storedNames.includes(name)) {  
            await addDapp(name);
            storedNames.push(name);
        }
    }
    localStorage.setItem('resolvedNames', JSON.stringify(storedNames));
}
initializeDefaultNames();

function updateStoredNames(ensName: string) {
    let storedNames = JSON.parse(localStorage.getItem('resolvedNames') || '[]');
    if (!storedNames.includes(ensName)) {
        storedNames.push(ensName);
        localStorage.setItem('resolvedNames', JSON.stringify(storedNames));
    }
}

async function addDapp(ensName: string) {
    const ensResolvedName = await resolveENSName(ensName);
    if (ensResolvedName) {
        await updateStoredNames(ensName);
        const strippedName = ensResolvedName.replace('/ipfs/', '');
        const resolvedAddress = CID.parse(strippedName).toV1(); // Ensure the CID is version 1
        const pinnedStatus = await checkIfPinned(resolvedAddress);

        renderResultDiv(ensName, resolvedAddress, pinnedStatus);
    }
}

function addDappRow(divs: HTMLElement[]) {
  const table = document.querySelector("#dapps tbody");
  const row = document.createElement("tr");
  divs.forEach(div => {
    const cell = document.createElement('td');
    cell.appendChild(div);
    row.appendChild(cell);
  });
  table.appendChild(row);
}

function renderResultDiv(ensName: string, siteRoot: CID, pinnedStatus: boolean): void {


    const urlDiv = document.createElement('div');
    urlDiv.className = 'table__item';
    const urlLink = document.createElement('a');
    urlLink.href = `http://${ensName}.ipns.localhost:8080`;
    urlLink.textContent = ensName;
    urlLink.target = '_blank';
    urlDiv.appendChild(urlLink);

    const risksDiv = document.createElement('div');
    risksDiv.className = 'table__item';
    risksDiv.appendChild(createThreePiecePieChart());

    const siteRootDiv = document.createElement('div');
    siteRootDiv.className = 'table__item';
    const siteRootLink = document.createElement('a');
    siteRootLink.href = `http://bafybeigggyffcf6yfhx5irtwzx3cgnk6n3dwylkvcpckzhqqrigsxowjwe.ipfs.localhost:8080/#/ipfs/${siteRoot}`;
    siteRootLink.textContent = siteRoot.toString();
    siteRootLink.target = '_blank';
    siteRootDiv.appendChild(siteRootLink);

    const pinnedDiv = document.createElement('div');
    pinnedDiv.className = 'table__item';
    const pinnedStatusDiv = document.createElement('div');
    pinnedStatusDiv.textContent = pinnedStatus ? 'Yes' : 'No';
    // Add a button to pin the resolved address
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Toggle';
    toggleButton.onclick = () => togglePin(siteRoot, pinnedStatusDiv);
    pinnedDiv.appendChild(pinnedStatusDiv);
    pinnedDiv.appendChild(toggleButton);

    addDappRow([urlDiv, risksDiv, siteRootDiv, pinnedDiv]);

}

const submitButton = document.getElementById('submitButton');
submitButton.addEventListener('click', handleInput);

async function resolveENSName(ensName: string): Promise<string> {
    try {
        for await (const name of kubo.name.resolve(ensName)) {
            return name
        }
        return ''
    } catch (error) {
        console.error('Error resolving ENS name:', error);
        const toast = document.createElement('div');
        toast.className = 'toast'; // Apply the CSS class
        toast.id = 'toast';
        toast.textContent = `Failed to resolve ENS name: ${ensName}`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 500); // Wait for fade out to finish
        }, 2000);
        return '';
    }
}

