import React, { useRef, useMemo } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  InputAdornment,
} from "@mui/material";
import { centsToRubInput, rubToCents } from "../../lib/appointmentPriceForm";

type PriceEditControlProps = {
  label: string;
  valueCents: number | null;
  calculatedCents: number;
  editable: boolean;
  manualEnabled: boolean;
  onManualEnabledChange: (next: boolean) => void;
  onValueCentsChange: (next: number | null) => void;
};

export const PriceEditControl: React.FC<PriceEditControlProps> = ({
  label,
  valueCents,
  calculatedCents,
  editable,
  manualEnabled,
  onManualEnabledChange,
  onValueCentsChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = useMemo(() => {
    if (manualEnabled) {
      return centsToRubInput(valueCents);
    }
    return centsToRubInput(calculatedCents);
  }, [manualEnabled, valueCents, calculatedCents]);

  const handleManualActivate = () => {
    onManualEnabledChange(true);
    if (valueCents === null) {
      onValueCentsChange(calculatedCents);
    }
    // Using setTimeout to ensure focus after state update and re-render
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleCancel = () => {
    onManualEnabledChange(false);
    onValueCentsChange(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = rubToCents(e.target.value);
    onValueCentsChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (manualEnabled && e.key === 'Escape') {
      e.stopPropagation();
      handleCancel();
    }
  };

  return (
    <Box sx={{ width: "100%", mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          fullWidth
          label={label}
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          disabled={!editable || !manualEnabled}
          variant="outlined"
          autoComplete="off"
          InputProps={{
            endAdornment: <InputAdornment position="end">₽</InputAdornment>,
            sx: manualEnabled
              ? {
                  backgroundColor: "rgba(25, 118, 210, 0.04)",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "primary.main",
                    borderWidth: 2,
                  },
                }
              : {},
          }}
        />
        {editable && (
          <Button
            variant="outlined"
            color={manualEnabled ? "inherit" : "primary"}
            onClick={manualEnabled ? handleCancel : handleManualActivate}
            sx={{ height: 56, minWidth: 100 }}
          >
            {manualEnabled ? "Отмена" : "Изменить"}
          </Button>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
        {manualEnabled ? (
          <Box component="span" sx={{ color: "primary.main", fontWeight: 500 }}>
            ● Цена изменена вручную
          </Box>
        ) : (
          `Авторасчёт из услуг: ${centsToRubInput(calculatedCents)} ₽`
        )}
      </Typography>
    </Box>
  );
};
