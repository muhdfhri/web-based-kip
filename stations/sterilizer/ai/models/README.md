# FFB ripeness model

Place the trained Ultralytics model at:

```text
models/ffb_ripeness.pt
```

The model may use these class labels (case-insensitive):

- `ripe`
- `unripe`, `under_ripe`, or `underripe`
- `overripe` or `over_ripe`

Aliases and confidence thresholds are configured in `config/grading_config.json`.
The service deliberately returns no synthetic detections when weights are absent.

