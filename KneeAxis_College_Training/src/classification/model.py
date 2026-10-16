"""
KneeAxis — ResNet50 KL Classification Model
=============================================
Builds a TensorFlow/Keras ResNet50-based model for Kellgren-Lawrence
osteoarthritis grading (5 classes: KL0–KL4).
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from typing import Tuple, Optional, Dict, Any


def build_resnet50_classifier(
    input_shape: Tuple[int, int, int] = (224, 224, 3),
    num_classes: int = 5,
    freeze_backbone: bool = True,
    dropout_rate: float = 0.3,
    label_smoothing: float = 0.1,
    learning_rate: float = 1e-4,
    pretrained_weights: Optional[str] = None,
    offline: bool = True,
    initialization: str = "local_pretrained",
    allow_random_init_fallback: bool = True,
) -> keras.Model:
    """
    Build a ResNet50-based KL grade classifier with offline pretrained weights support.

    Parameters
    ----------
    input_shape : tuple
        (H, W, C) input image dimensions.
    num_classes : int
        Number of output classes (default 5 for KL0–KL4).
    freeze_backbone : bool
        If True, freeze all ResNet50 layers (for initial transfer learning).
    dropout_rate : float
        Dropout rate before the classification head.
    label_smoothing : float
        Label smoothing factor for the loss function.
    learning_rate : float
        Learning rate for the Adam optimiser.
    pretrained_weights : str, optional
        Path to local offline weights (.h5 file).
    offline : bool
        If True, prevents any online weight downloading.
    initialization : str
        'local_pretrained', 'random', or 'imagenet'.
    allow_random_init_fallback : bool
        If True, allows random initialization if local weights file is missing.

    Returns
    -------
    keras.Model
        Compiled Keras model.
    """
    from pathlib import Path
    init_method = "random"
    weights_loaded_from = None

    # Check local offline weights
    if pretrained_weights or initialization == "local_pretrained":
        target_path = Path(pretrained_weights) if pretrained_weights else Path("pretrained/resnet50_imagenet_notop.h5")
        if not target_path.is_absolute():
            from src.common.paths import PROJECT_ROOT
            if (PROJECT_ROOT / target_path).exists():
                target_path = PROJECT_ROOT / target_path
            elif Path(target_path).exists():
                target_path = Path(target_path).resolve()

        if target_path.exists():
            print(f"[Model A] Loading offline pretrained weights from: {target_path}")
            base_model = keras.applications.ResNet50(
                include_top=False,
                weights=None,
                input_shape=input_shape,
                pooling=None,
            )
            base_model.load_weights(str(target_path))
            init_method = "local_pretrained"
            weights_loaded_from = str(target_path)
        else:
            if offline:
                if allow_random_init_fallback:
                    print(f"[WARNING] Offline pretrained weights not found at: {target_path}")
                    print("[WARNING] Initializing ResNet50 with RANDOM weights (offline mode).")
                    print("[WARNING] NOTE: Training will start from scratch (NOT transfer learning)!")
                    base_model = keras.applications.ResNet50(
                        include_top=False,
                        weights=None,
                        input_shape=input_shape,
                        pooling=None,
                    )
                    init_method = "random_fallback"
                else:
                    raise FileNotFoundError(
                        f"Offline mode active and pretrained weights not found: {target_path}.\n"
                        "Download resnet50_imagenet_notop.h5 to pretrained/ directory or set allow_random_init_fallback: true."
                    )
            else:
                print("[Model A] Downloading ImageNet weights (online mode)...")
                base_model = keras.applications.ResNet50(
                    include_top=False,
                    weights="imagenet",
                    input_shape=input_shape,
                    pooling=None,
                )
                init_method = "imagenet_download"
    elif initialization == "random" or (offline and not pretrained_weights):
        print("[Model A] Initializing ResNet50 with random weights.")
        base_model = keras.applications.ResNet50(
            include_top=False,
            weights=None,
            input_shape=input_shape,
            pooling=None,
        )
        init_method = "random"
    else:
        # Online fallback
        base_model = keras.applications.ResNet50(
            include_top=False,
            weights="imagenet",
            input_shape=input_shape,
            pooling=None,
        )
        init_method = "imagenet_download"

    base_model.trainable = not freeze_backbone

    # Classification head
    inputs = keras.Input(shape=input_shape, name="input_image")
    x = keras.applications.resnet50.preprocess_input(inputs)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D(name="gap")(x)
    x = layers.Dropout(dropout_rate, name="dropout")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="kl_output")(x)

    model = keras.Model(inputs=inputs, outputs=outputs, name="KneeAxis_ResNet50_KL")
    model._kneeaxis_init_method = init_method
    model._kneeaxis_weights_path = weights_loaded_from

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss=keras.losses.CategoricalCrossentropy(label_smoothing=label_smoothing),
        metrics=[
            "accuracy",
            keras.metrics.Precision(name="precision"),
            keras.metrics.Recall(name="recall"),
        ],
    )

    return model


def unfreeze_backbone(
    model: keras.Model,
    fine_tune_from_layer: int = 100,
    learning_rate: float = 1e-5,
    label_smoothing: float = 0.1,
) -> keras.Model:
    """
    Unfreeze the ResNet50 backbone from a given layer index onward
    and recompile with a lower learning rate for fine-tuning.
    """
    # Find the ResNet50 base model inside the functional model
    base = None
    for layer in model.layers:
        if isinstance(layer, keras.Model) and "resnet50" in layer.name.lower():
            base = layer
            break
    if base is None:
        # Flat model — just iterate layers
        for layer in model.layers[:fine_tune_from_layer]:
            layer.trainable = False
        for layer in model.layers[fine_tune_from_layer:]:
            layer.trainable = True
    else:
        base.trainable = True
        for layer in base.layers[:fine_tune_from_layer]:
            layer.trainable = False

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss=keras.losses.CategoricalCrossentropy(label_smoothing=label_smoothing),
        metrics=[
            "accuracy",
            keras.metrics.Precision(name="precision"),
            keras.metrics.Recall(name="recall"),
        ],
    )

    return model


def get_model_config(model: keras.Model) -> Dict[str, Any]:
    """
    Extract model configuration as a serialisable dictionary
    for saving alongside weights.
    """
    return {
        "model_name": "ResNet50_KL_Classifier",
        "num_classes": 5,
        "input_shape": list(model.input_shape[1:]),
        "class_mapping": {
            "0": "KL 0 - Normal",
            "1": "KL 1 - Doubtful",
            "2": "KL 2 - Minimal",
            "3": "KL 3 - Moderate",
            "4": "KL 4 - Severe",
        },
        "backbone": "ResNet50",
        "initialization": getattr(model, "_kneeaxis_init_method", "unknown"),
        "pretrained_weights_file": getattr(model, "_kneeaxis_weights_path", None),
        "weights_file": "best.weights.h5",
        "framework": "TensorFlow/Keras",
        "preprocessing": "resnet50_preprocess_input",
        "total_params": int(model.count_params()),
    }

