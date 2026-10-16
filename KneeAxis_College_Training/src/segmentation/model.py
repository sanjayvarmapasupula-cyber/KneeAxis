"""
KneeAxis — 3D U-Net Segmentation Model
========================================
TensorFlow/Keras 3D U-Net for knee MRI segmentation.
Labels: 0=BG, 1=Femur, 2=Femoral Cart, 3=Tibia, 4=Med Tib Cart, 5=Lat Tib Cart.
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from typing import Tuple, List, Dict, Any


def _conv_block_3d(x, filters, name_prefix):
    """Two 3×3×3 convolutions + BatchNorm + ReLU."""
    x = layers.Conv3D(filters, 3, padding="same", name=f"{name_prefix}_conv1")(x)
    x = layers.BatchNormalization(name=f"{name_prefix}_bn1")(x)
    x = layers.Activation("relu", name=f"{name_prefix}_relu1")(x)
    x = layers.Conv3D(filters, 3, padding="same", name=f"{name_prefix}_conv2")(x)
    x = layers.BatchNormalization(name=f"{name_prefix}_bn2")(x)
    x = layers.Activation("relu", name=f"{name_prefix}_relu2")(x)
    return x


def build_3d_unet(
    input_shape: Tuple[int, int, int, int] = (96, 96, 96, 1),
    num_classes: int = 6,
    encoder_filters: List[int] = None,
    bottleneck_filters: int = 512,
    dropout_rate: float = 0.3,
    learning_rate: float = 1e-4,
    base_filters: int = None,
    **kwargs,
) -> keras.Model:
    """
    Build a 3D U-Net for volumetric knee segmentation.

    Parameters
    ----------
    input_shape : tuple
        (D, H, W, C) — depth, height, width, channels.
    num_classes : int
        Number of segmentation classes (including background).
    encoder_filters : list of int
        Filter counts for each encoder level.
    bottleneck_filters : int
        Filter count for the bottleneck.
    dropout_rate : float
    learning_rate : float
    base_filters : int, optional
        Base filter count (e.g. 16 -> [16, 32, 64, 128], bottleneck 256).

    Returns
    -------
    keras.Model
        Compiled 3D U-Net model.
    """
    if base_filters is not None and encoder_filters is None:
        encoder_filters = [base_filters, base_filters * 2, base_filters * 4, base_filters * 8]
        bottleneck_filters = base_filters * 16
    elif encoder_filters is None:
        encoder_filters = [32, 64, 128, 256]

    inputs = keras.Input(shape=input_shape, name="input_volume")

    # Normalise input to [0, 1] range if not already
    x = inputs

    # Encoder path
    skip_connections = []
    for i, filters in enumerate(encoder_filters):
        x = _conv_block_3d(x, filters, name_prefix=f"enc{i}")
        skip_connections.append(x)
        x = layers.MaxPool3D(pool_size=2, name=f"enc{i}_pool")(x)

    # Bottleneck
    x = _conv_block_3d(x, bottleneck_filters, name_prefix="bottleneck")
    x = layers.Dropout(dropout_rate, name="bottleneck_dropout")(x)

    # Decoder path
    for i, filters in enumerate(reversed(encoder_filters)):
        skip = skip_connections[-(i + 1)]
        x = layers.Conv3DTranspose(
            filters, kernel_size=2, strides=2, padding="same",
            name=f"dec{i}_upconv"
        )(x)
        x = layers.Concatenate(name=f"dec{i}_concat")([x, skip])
        x = _conv_block_3d(x, filters, name_prefix=f"dec{i}")

    # Output
    outputs = layers.Conv3D(
        num_classes, kernel_size=1, activation="softmax", name="seg_output"
    )(x)

    model = keras.Model(inputs=inputs, outputs=outputs, name="KneeAxis_3D_UNet")

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss=dice_ce_loss(num_classes=num_classes),
        metrics=[mean_foreground_dice_metric(num_classes=num_classes)],
    )

    return model


# ---------------------------------------------------------------------------
# Custom loss: combined Dice + Cross-Entropy
# ---------------------------------------------------------------------------

def dice_ce_loss(num_classes=6, dice_smooth=1.0, dice_weight=0.5, ce_weight=0.5):
    """Combined Dice loss + categorical cross-entropy."""

    def loss_fn(y_true, y_pred):
        # y_true: one-hot (B, D, H, W, C)   y_pred: softmax probabilities
        # Cross-entropy part
        ce = tf.keras.losses.categorical_crossentropy(y_true, y_pred)
        ce = tf.reduce_mean(ce)

        # Dice part — average over foreground classes only
        dice_losses = []
        for c in range(1, num_classes):  # skip background
            y_t = y_true[..., c]
            y_p = y_pred[..., c]
            intersection = tf.reduce_sum(y_t * y_p)
            union = tf.reduce_sum(y_t) + tf.reduce_sum(y_p)
            dice = (2.0 * intersection + dice_smooth) / (union + dice_smooth)
            dice_losses.append(1.0 - dice)

        dice_loss = tf.reduce_mean(dice_losses)
        return dice_weight * dice_loss + ce_weight * ce

    loss_fn.__name__ = "dice_ce_loss"
    return loss_fn


def mean_foreground_dice_metric(num_classes=6, smooth=1e-7):
    """Mean foreground Dice as a Keras metric."""

    def mean_fg_dice(y_true, y_pred):
        dices = []
        for c in range(1, num_classes):
            y_t = y_true[..., c]
            y_p = y_pred[..., c]
            intersection = tf.reduce_sum(y_t * y_p)
            union = tf.reduce_sum(y_t) + tf.reduce_sum(y_p)
            dices.append((2.0 * intersection + smooth) / (union + smooth))
        return tf.reduce_mean(dices)

    mean_fg_dice.__name__ = "mean_fg_dice"
    return mean_fg_dice


class CombinedDiceAndCELoss(keras.losses.Loss):
    """Keras serializable Combined Dice + Categorical Cross-Entropy Loss."""

    def __init__(self, num_classes: int = 6, dice_weight: float = 0.5, ce_weight: float = 0.5, name: str = "combined_dice_ce_loss", **kwargs):
        super().__init__(name=name, **kwargs)
        self.num_classes = num_classes
        self.dice_weight = dice_weight
        self.ce_weight = ce_weight
        self.loss_fn = build_combined_loss(num_classes, dice_weight, ce_weight)

    def call(self, y_true, y_pred):
        return self.loss_fn(y_true, y_pred)

    def get_config(self):
        config = super().get_config()
        config.update({
            "num_classes": self.num_classes,
            "dice_weight": self.dice_weight,
            "ce_weight": self.ce_weight,
        })
        return config


class MeanForegroundDice(keras.metrics.Metric):
    """Keras serializable Mean Foreground Dice Metric."""

    def __init__(self, num_classes: int = 6, smooth: float = 1e-7, name: str = "mean_foreground_dice", **kwargs):
        super().__init__(name=name, **kwargs)
        self.num_classes = num_classes
        self.smooth = smooth
        self.metric_fn = mean_foreground_dice_metric(num_classes, smooth)
        self.total = self.add_weight(name="total", initializer="zeros")
        self.count = self.add_weight(name="count", initializer="zeros")

    def update_state(self, y_true, y_pred, sample_weight=None):
        val = self.metric_fn(y_true, y_pred)
        self.total.assign_add(val)
        self.count.assign_add(1.0)

    def result(self):
        return tf.math.divide_no_nan(self.total, self.count)

    def reset_state(self):
        self.total.assign(0.0)
        self.count.assign(0.0)

    def get_config(self):
        config = super().get_config()
        config.update({
            "num_classes": self.num_classes,
            "smooth": self.smooth,
        })
        return config



def get_model_config(model: keras.Model) -> Dict[str, Any]:
    """Extract segmentation model configuration for JSON serialisation."""
    return {
        "model_name": "3D_UNet_Knee_Segmentation",
        "num_classes": 6,
        "input_shape": list(model.input_shape[1:]),
        "class_mapping": {
            "0": "background",
            "1": "femur",
            "2": "femoral_cartilage",
            "3": "tibia",
            "4": "medial_tibial_cartilage",
            "5": "lateral_tibial_cartilage",
        },
        "architecture": "3D U-Net",
        "weights_file": "best.weights.h5",
        "framework": "TensorFlow/Keras",
        "total_params": int(model.count_params()),
        "note": "This model does NOT segment patella or fibula. "
                "The OAIZIB-CM dataset does not provide those labels.",
    }


def validate_patch_size(patch_size: List[int], num_pools: int = 4) -> bool:
    """
    Verify that the patch size is compatible with the U-Net architecture.
    Each dimension must be divisible by 2^num_pools.
    """
    divisor = 2 ** num_pools
    for i, s in enumerate(patch_size):
        if s % divisor != 0:
            print(
                f"ERROR: patch_size[{i}]={s} is not divisible by {divisor}. "
                f"Each patch dimension must be divisible by 2^{num_pools}={divisor} "
                f"for a U-Net with {num_pools} pooling levels."
            )
            return False
    return True
