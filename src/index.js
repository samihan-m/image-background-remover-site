// @ts-check

// Mozilla docs recommend wrapping worker-accessing code in a conditional for "slightly more controlled error handling and backwards compatibility"
// This is a guard clause version of that
if (!window.Worker) {
    alert('Your browser does not support Web Workers. The app will not work as expected. Sorry! Consider using a browser that supports Web Workers.');
    throw new Error('');
}

const fileUpload = document.getElementById('file-upload');
const imageContainer = document.getElementById('image-container');
const statusLabel = document.getElementById('status');
if (!fileUpload || !imageContainer || !statusLabel) {
    alert('The webpage is missing required elements. Things will not work as expected.')
    throw new Error('Could not find the required elements in the DOM. Please check the HTML file.');
}

const worker = new Worker('./worker.js', { type: 'module' });
statusLabel.textContent = 'Loading model...';
worker.addEventListener('message', (messageEvent) => {
    const message = messageEvent.data;
    if (message.status) {
        statusLabel.textContent = message.status;
    }
    if(message.output) {
        console.log(message.output);
        // The output is a 1 channel image, so we need to convert it to a 4 channel image

        const imageData = new ImageData(message.output.data, message.output.width, message.output.height);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = message.output.width;
        canvas.height = message.output.height;
        ctx.putImageData(imageData, 0, 0);
        const image = document.createElement('img');
        image.src = canvas.toDataURL();
        imageContainer.innerHTML = '';
        imageContainer.appendChild(image);
    }
});

fileUpload.addEventListener('change', (changeEvent) => {
    const file = changeEvent.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.addEventListener('load', (loadEvent) => {
        const image = document.createElement('img');
        image.src = loadEvent.target.result;
        imageContainer.innerHTML = '';
        imageContainer.appendChild(image);

        worker.postMessage({
            imageData: loadEvent.target.result,
        });
    });

    reader.readAsDataURL(file);
})