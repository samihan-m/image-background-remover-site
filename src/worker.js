// @ts-check

import { AutoModel, AutoProcessor, RawImage } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

let model = null;
let processor = null;

/**
 * @param {string} imageData 
 */
async function run(imageData) {
    if(model === null || processor === null) {
        throw new Error('Model not loaded');
    }

    postMessage({ status: 'Inference in progress...' });
    const image = await RawImage.fromURL(imageData);
    const { pixel_values: pixelValues } = await processor(image);
    const { output } = await model({ input: pixelValues });

    const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width, image.height);

    // The image is RGB, and the mask is RGBA - I think we can just add the alpha channel to the image
    const alteredImageData = Uint8ClampedArray.from(Array.from(image.rgba().data).flatMap((value, index) => {
        if(index % 4 === 3) {
            return mask.data[Math.floor(index / 4)];
        }
        return value;
    }));

    postMessage({ status: 'Done!', output: {
        data: alteredImageData,
        width: image.width,
        height: image.height,
        channels: 4
    } });
}

/**
 * @param {MessageEvent<ImageUpload>} event
 */
onmessage = async (event) => {
    // We don't want to proceed until the model is loaded but we don't want to drop the message, either
    while (model === null || processor === null) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await run(event.data.imageData);
}

[model, processor] = await Promise.all([
    AutoModel.from_pretrained('Xenova/modnet', { quantized: false }),
    AutoProcessor.from_pretrained('Xenova/modnet')
]);

postMessage({ status: 'Model loaded' });