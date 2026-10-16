# Offline Pretrained Weights Directory

Place your offline pretrained weights file here:
`pretrained/resnet50_imagenet_notop.h5`

### Why this is needed:
On college GPU servers without internet access, Keras cannot download weights from Google APIs.
Download this file on your laptop (which has internet) and place it here before uploading the package:

Direct URL:
https://storage.googleapis.com/tensorflow/keras-applications/resnet/resnet50_weights_tf_dim_ordering_tf_kernels_notop.h5

Rename the downloaded file to:
`resnet50_imagenet_notop.h5`
