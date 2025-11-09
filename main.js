const port = chrome.runtime.connect()
document.addEventListener("DOMContentLoaded", () => {
    // Load the saved credential string and display it on startup
    chrome.storage.local.get(['api_credentials'], (result) => {
        if (result.api_credentials) {
            document.getElementById('api_creds_input').value = result.api_credentials;
        }
    });

    // Add a click listener for the "Save Credentials" button
    document.getElementById("save_creds_btn").addEventListener("click", () => {
        const creds = document.getElementById("api_creds_input").value;

        // Check that the user has pasted something that looks correct
        if (creds && creds.includes('&api_key=') && creds.includes('&user_id=')) {
            chrome.storage.local.set({ api_credentials: creds }, () => {
                const btn = document.getElementById("save_creds_btn");
                btn.textContent = "Saved!";
                setTimeout(() => { btn.textContent = "Save Credentials"; }, 2000);
            });
        } else {
            const btn = document.getElementById("save_creds_btn");
            btn.textContent = "Invalid Format! Paste the full string.";
            setTimeout(() => { btn.textContent = "Save Credentials"; }, 3000);
        }
    });
});
const infobox = document.getElementById("infobox")
const cpgl = document.getElementById("cpgl")
const dgpi = document.getElementById("dgpi")
const closetabs = document.getElementById("closetabs")
const autoclosetabs = document.getElementById("autoclosetabs")
const nnnblock = document.getElementById("nnnblock")

chrome.storage.local.get(null, options => {
    autoclosetabs.checked = options.autoclosetabs
    nnnblock.checked = !options.nnnblock
})

port.onMessage.addListener(message => {
    if(message.type === "action"){
        if(message.action === "setInfobox"){
            infobox.style.color = message.data.textColor
            infobox.innerText = message.data.content

            window.scrollTo(0, document.body.scrollHeight)
        } else if(message.action === "clipboardWriteText"){
            navigator.clipboard.writeText(message.data.content)
        }
    }
})

function tabOperation(type, data){
    port.postMessage({ type, data })
}

cpgl.addEventListener("click", (ev) => tabOperation("cpgl"))
dgpi.addEventListener("click", (ev) => tabOperation("dgpi"))
closetabs.addEventListener("click", (ev) => tabOperation("closetabs"))
autoclosetabs.addEventListener("change", (ev) => tabOperation("autoclosetabs_swchange", autoclosetabs.checked))
nnnblock.addEventListener("change", (ev) => tabOperation("nnnblock_swchange", nnnblock.checked))
