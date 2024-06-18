import './styles.css'
import { createRiskChart } from './pie-chart'
import { isOnline, isPinned, pin, unpin, resolveENS } from './kubo'
import { getFaviconUrl } from './reports'

import { CID } from 'multiformats/cid';

const $install = document.querySelector('#install') as HTMLElement

let kuboOnline = false
async function checkKubo() {
    if (kuboOnline) {
        return
    }
    kuboOnline = await isOnline()
}

async function maybeDisplayInstall() {
    await checkKubo()
    if (!kuboOnline) {
        $install.style.display = 'block';
    }
}

maybeDisplayInstall()



async function togglePin(ipfsAddress: CID, statusElement: HTMLElement): Promise<void> {
    const isCurrentlyPinned = statusElement.textContent === '✅';
    try {
        if (isCurrentlyPinned) {
            await unpin(ipfsAddress);
            console.log(`Successfully unpinned address: ${ipfsAddress}`);
        } else {
            await pin(ipfsAddress);
            console.log(`Successfully pinned address: ${ipfsAddress}`);
        }
        // Update the status element to reflect the new pinning status after toggling
        statusElement.textContent = !isCurrentlyPinned ? '✅' : '❌';
    } catch (error) {
        console.error(`Error toggling pin on IPFS address: ${ipfsAddress}`, error);
        statusElement.textContent = 'Error';
    }
}

async function handleInput() {
    const submitButton = document.getElementById('submitButton') as HTMLButtonElement;
    submitButton.disabled = true;

    if (!kuboOnline) {
        const text = 'Adding local dapps requires an IPFS node. '
            + 'If you want to suggest a dapp for the default list, please open a '
            + '<a href="https://github.com/oed/dappdir.eth/issues/new" target="_blank">github issue</a>'
        displayToast(text, 6000);
    } else {
        var userInputElement = document.getElementById('textInput') as HTMLInputElement;
        var ensName = userInputElement.value;
        const siteRoot = await resolveENS(ensName);
        await addDapp(ensName, siteRoot);
    }

    submitButton.disabled = false;
}
// async function loadAndDisplayDapps() {
//     const storedNames = JSON.parse(localStorage.getItem('resolvedNames') || '[]');
//     for (const ensName of storedNames) {
//         await addDapp(ensName);
//     }
// }

async function loadCuratedNames() {
    let storedNames = await fetch('./names.json').then(response => response.json());
    await checkKubo()
    for (const name in storedNames) {
        const siteRoot = CID.parse(storedNames[name].pop().cid);
        await addDapp(name, siteRoot);
    }
}

loadCuratedNames();

// function updateStoredNames(ensName: string) {
//     let storedNames = JSON.parse(localStorage.getItem('resolvedNames') || '[]');
//     if (!storedNames.includes(ensName)) {
//         storedNames.push(ensName);
//         localStorage.setItem('resolvedNames', JSON.stringify(storedNames));
//     }
// }

interface DappVersions {
    cid: string;
    timestamp: number;
}

async function addDapp(ensName: string, siteRoot: CID) {
    // const siteRoot = CID.parse(dappVersions[0].cid)
    const pinnedStatus = kuboOnline ? await isPinned(siteRoot) : false;

    renderResultDiv(ensName, siteRoot, pinnedStatus);
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

async function renderResultDiv(ensName: string, siteRoot: CID, pinnedStatus: boolean): Promise<void> {

    const urlDiv = document.createElement('div');
    urlDiv.className = 'table__item';
    const urlLink = document.createElement('a');
    if (kuboOnline) {
        urlLink.href = `http://${ensName}.ipns.localhost:8080`;
    } else {
        urlLink.href = `https://${ensName}.limo`;
    }
    urlLink.target = '_blank';

    const urlIcon = document.createElement('img');
    urlIcon.src = await getFaviconUrl(siteRoot);
    urlIcon.alt = 'dapp-logo';
    urlIcon.width = 16;
    urlIcon.height = 16;
    urlIcon.style.marginRight = '0.3em';
    urlLink.appendChild(urlIcon);

    const urlText = document.createElement('span');
    urlText.textContent = ensName;
    urlLink.appendChild(urlText);

    urlDiv.appendChild(urlLink);

    const risksDiv = document.createElement('div');
    risksDiv.className = 'table__item';
    risksDiv.appendChild(await createRiskChart(siteRoot));

    const siteRootDiv = document.createElement('div');
    siteRootDiv.className = 'table__item';
    const siteRootLink = document.createElement('a');
    if (kuboOnline) {
        siteRootLink.href = `http://bafybeigggyffcf6yfhx5irtwzx3cgnk6n3dwylkvcpckzhqqrigsxowjwe.ipfs.localhost:8080/#/ipfs/${siteRoot}`;
    }
    siteRootLink.textContent = siteRoot.toString();
    siteRootLink.target = '_blank';
    siteRootDiv.appendChild(siteRootLink);

    const pinnedStatusDiv = document.createElement('span');
    pinnedStatusDiv.textContent = pinnedStatus ? '✅' : '❌';
    pinnedStatusDiv.style.width = '100%';
    pinnedStatusDiv.style.textAlign = 'center'; // Center the text content

    const pinnedDiv = document.createElement('div');
    pinnedDiv.className = 'table__item';
    pinnedDiv.style.transition = 'background-color 0.3s'; // Smooth transition for background color change
    pinnedDiv.onmouseover = () => { 
        pinnedDiv.style.backgroundColor = '#f0f0f0'; 
        pinnedDiv.style.cursor = 'pointer'; // Make the mouse cursor appear as a pointer
    }; // Change background on hover
    pinnedDiv.onmouseout = () => { 
        pinnedDiv.style.backgroundColor = 'transparent'; 
        pinnedDiv.style.cursor = 'default'; // Revert the mouse cursor to default
    }; // Revert background on mouse out


    if (kuboOnline) {
        pinnedDiv.onclick = () => { togglePin(siteRoot, pinnedStatusDiv); }; // Toggle pin on click
    } else {
        pinnedDiv.onclick = () => {
            displayToast('Pinning requires local IPFS node', 3000);
        };
    }
    pinnedDiv.appendChild(pinnedStatusDiv);

    addDappRow([urlDiv, risksDiv, siteRootDiv, pinnedDiv]);

}

async function displayToast(message: string, duration: number) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), duration);
}

const submitButton = document.getElementById('submitButton');
submitButton.addEventListener('click', handleInput);
