import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import type {
  Amenity,
  Listing,
  ListingRequest,
  ReferenceData,
} from "../api/types";
import { formatAmenity } from "../utils/format";
import { centsToDollarsInput, parseDollarsToCents } from "../utils/money";
import { BackButton } from "./BackButton";
import { Button } from "./Button";
import { CheckboxGroup } from "./CheckboxGroup";
import { FormAlert } from "./FormAlert";
import { ImageUrlsField } from "./ImageUrlsField";
import { SelectField } from "./SelectField";
import { TextAreaField } from "./TextAreaField";
import { TextField } from "./TextField";

const MAX_IMAGES = 5;

interface FormValues {
  title: string;
  description: string;
  price: string;
  areaSqft: string;
  neighborhood: string;
  address: string;
  amenities: Amenity[];
  imageUrls: string[];
}

type Errors = Record<string, string>;

interface ListingFormProps {
  heading: string;
  /** Where Back goes when there is no earlier page in the app. */
  backTo: string;
  referenceData: ReferenceData;
  /** The listing being edited; omit to create a new one. */
  listing?: Listing;
  submitLabel: string;
  onSubmit: (request: ListingRequest) => Promise<void>;
}

/** Create/edit form for FR-02, shared by the "new" and "edit" pages. */
export function ListingForm({
  heading,
  backTo,
  referenceData,
  listing,
  submitLabel,
  onSubmit,
}: ListingFormProps) {
  const [initialValues] = useState<FormValues>(() => toValues(listing));
  const [values, setValues] = useState<FormValues>(initialValues);
  const [saved, setSaved] = useState(false);
  const dirty =
    !saved && JSON.stringify(values) !== JSON.stringify(initialValues);

  // Warn before closing the tab or reloading with unsaved changes (D-027).
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
  const [errors, setErrors] = useState<Errors>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert(null);
    const { request, errors: clientErrors } = validate(values);
    setErrors(clientErrors);
    if (!request) {
      setAlert("Please fix the highlighted fields.");
      return;
    }
    setBusy(true);
    try {
      setSaved(true);
      await onSubmit(request);
    } catch (e) {
      setSaved(false);
      if (e instanceof ApiError && e.body.fieldErrors.length > 0) {
        setErrors(fromServerErrors(e.fieldErrors()));
        setAlert("Please fix the highlighted fields.");
      } else {
        setAlert(
          e instanceof ApiError ? e.body.message : "Something went wrong.",
        );
      }
      setBusy(false);
    }
  }

  const imageErrors: Record<number, string> = {};
  for (const [key, message] of Object.entries(errors)) {
    const match = /^imageUrls\[(\d+)\]$/.exec(key);
    if (match) imageErrors[Number(match[1])] = message;
  }

  return (
    <>
      <div className="page-toolbar">
        <BackButton fallback={backTo} confirmLeave={dirty} />
      </div>
      <h1>{heading}</h1>
      <form className="listing-form" onSubmit={handleSubmit} noValidate>
        <FormAlert message={alert} />
        <TextField
          label="Title"
          maxLength={100}
          placeholder="Sunny studio near UW"
          value={values.title}
          error={errors.title}
          onChange={(e) => set("title", e.target.value)}
        />
        <div className="field-row">
          <TextField
            label="Monthly rent (USD)"
            inputMode="decimal"
            placeholder="1650"
            value={values.price}
            error={errors.price}
            onChange={(e) => set("price", e.target.value)}
          />
          <TextField
            label="Area (sq ft)"
            inputMode="numeric"
            placeholder="420"
            value={values.areaSqft}
            error={errors.areaSqft}
            onChange={(e) => set("areaSqft", e.target.value)}
          />
        </div>
        <SelectField
          label="Neighborhood"
          options={[
            { value: "", label: "Choose a neighborhood" },
            ...referenceData.neighborhoods.map((n) => ({ value: n, label: n })),
          ]}
          value={values.neighborhood}
          error={errors.neighborhood}
          onChange={(e) => set("neighborhood", e.target.value)}
        />
        <TextField
          label="Street address"
          maxLength={200}
          hint={`City: ${referenceData.city}`}
          value={values.address}
          error={errors.address}
          onChange={(e) => set("address", e.target.value)}
        />
        <TextAreaField
          label="Description (optional)"
          rows={5}
          maxLength={2000}
          value={values.description}
          error={errors.description}
          onChange={(e) => set("description", e.target.value)}
        />
        <CheckboxGroup
          legend="Amenities"
          options={referenceData.amenities.map((a) => ({
            value: a,
            label: formatAmenity(a),
          }))}
          selected={values.amenities}
          error={errors.amenities}
          onChange={(selected) => set("amenities", selected)}
        />
        <ImageUrlsField
          urls={values.imageUrls}
          max={MAX_IMAGES}
          errors={imageErrors}
          error={errors.imageUrls}
          onChange={(urls) => set("imageUrls", urls)}
        />
        <Button type="submit" busy={busy}>
          {submitLabel}
        </Button>
      </form>
    </>
  );
}

function toValues(listing?: Listing): FormValues {
  return {
    title: listing?.title ?? "",
    description: listing?.description ?? "",
    price: listing ? centsToDollarsInput(listing.monthlyPriceCents) : "",
    areaSqft: listing ? String(listing.areaSqft) : "",
    neighborhood: listing?.neighborhood ?? "",
    address: listing?.address ?? "",
    amenities: listing?.amenities ?? [],
    imageUrls: listing?.imageUrls ?? [],
  };
}

/** Quick checks that mirror the server rules (FR-02 AC1, AC2); the server checks again. */
function validate(values: FormValues): {
  request: ListingRequest | null;
  errors: Errors;
} {
  const errors: Errors = {};
  const title = values.title.trim();
  if (title.length < 5) errors.title = "Use at least 5 characters";

  const cents = parseDollarsToCents(values.price);
  if (cents === null || cents <= 0) {
    errors.price = "Enter a monthly rent such as 1650 or 1650.50";
  }

  const area = Number(values.areaSqft);
  if (!/^\d+$/.test(values.areaSqft.trim()) || area <= 0) {
    errors.areaSqft = "Enter a whole number of square feet";
  }

  if (!values.neighborhood) errors.neighborhood = "Choose a neighborhood";
  if (!values.address.trim()) errors.address = "Enter the street address";

  const imageUrls = values.imageUrls.map((u) => u.trim()).filter(Boolean);
  values.imageUrls.forEach((url, index) => {
    const trimmed = url.trim();
    if (trimmed && !trimmed.startsWith("https://")) {
      errors[`imageUrls[${index}]`] = "Use a link that starts with https://";
    }
  });

  if (Object.keys(errors).length > 0 || cents === null) {
    return { request: null, errors };
  }
  return {
    request: {
      title,
      description: values.description.trim(),
      monthlyPriceCents: cents,
      areaSqft: area,
      neighborhood: values.neighborhood,
      address: values.address.trim(),
      amenities: values.amenities,
      imageUrls,
    },
    errors,
  };
}

/** The server names the price field monthlyPriceCents; the form calls it price. */
function fromServerErrors(fieldErrors: Errors): Errors {
  const errors: Errors = {};
  for (const [field, message] of Object.entries(fieldErrors)) {
    errors[field === "monthlyPriceCents" ? "price" : field] = message;
  }
  return errors;
}
