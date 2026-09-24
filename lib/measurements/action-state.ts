export type MeasurementActionState = {
  status: "idle" | "success" | "error";
  message: string;
  errors: string[];
};

export const initialMeasurementActionState: MeasurementActionState = {
  status: "idle",
  message: "",
  errors: [],
};