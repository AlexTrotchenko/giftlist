import { useCallback, useRef, useState } from "react";
import { Upload, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from "@/lib/validations/upload";
import * as m from "@/paraglide/messages";

interface ImageUploadProps {
	value?: string | null;
	onChange: (url: string | null) => void;
	disabled?: boolean;
	className?: string;
}

type UploadState = "idle" | "uploading" | "error";

const ACCEPT_STRING = ALLOWED_IMAGE_TYPES.join(",");
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE / (1024 * 1024);

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageUpload({
	value,
	onChange,
	disabled = false,
	className,
}: ImageUploadProps) {
	const [uploadState, setUploadState] = useState<UploadState>("idle");
	const [error, setError] = useState<string | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [isDragOver, setIsDragOver] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const validateFile = (file: File): string | null => {
		if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
			return m.validation_fileMustBeImage();
		}
		if (file.size > MAX_FILE_SIZE) {
			return m.validation_fileTooLarge();
		}
		return null;
	};

	const uploadFile = async (file: File) => {
		setUploadState("uploading");
		setError(null);

		// Create preview
		const previewUrl = URL.createObjectURL(file);
		setPreview(previewUrl);

		const formData = new FormData();
		formData.append("file", file);

		try {
			const response = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});

			const data: { url?: string; error?: string } = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Upload failed");
			}

			if (data.url) {
				onChange(data.url);
			}
			setUploadState("idle");
		} catch (err) {
			setUploadState("error");
			setError(err instanceof Error ? err.message : "Upload failed");
			setPreview(null);
			URL.revokeObjectURL(previewUrl);
		}
	};

	const handleFile = useCallback(
		(file: File) => {
			const validationError = validateFile(file);
			if (validationError) {
				setError(validationError);
				setUploadState("error");
				return;
			}
			uploadFile(file);
		},
		[onChange],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragOver(false);

			if (disabled || uploadState === "uploading") return;

			const file = e.dataTransfer.files[0];
			if (file) {
				handleFile(file);
			}
		},
		[disabled, uploadState, handleFile],
	);

	const handleDragOver = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			if (!disabled && uploadState !== "uploading") {
				setIsDragOver(true);
			}
		},
		[disabled, uploadState],
	);

	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragOver(false);
	}, []);

	const handleClick = () => {
		if (!disabled && uploadState !== "uploading") {
			inputRef.current?.click();
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			handleFile(file);
		}
		// Reset input so same file can be selected again
		e.target.value = "";
	};

	const handleRemove = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange(null);
		setPreview(null);
		setError(null);
		setUploadState("idle");
	};

	const displayImage = value || preview;
	const isInteractive = !disabled && uploadState !== "uploading";

	return (
		<div className={cn("grid gap-2", className)}>
			<div
				role="button"
				tabIndex={isInteractive ? 0 : -1}
				onClick={handleClick}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleClick();
					}
				}}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				className={cn(
					"relative flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
					isDragOver && "border-primary bg-primary/5",
					!isDragOver && !displayImage && "border-muted-foreground/25 hover:border-primary/50",
					displayImage && "border-transparent",
					(disabled || uploadState === "uploading") && "cursor-not-allowed opacity-50",
					uploadState === "error" && "border-destructive",
				)}
			>
				<input
					ref={inputRef}
					type="file"
					accept={ACCEPT_STRING}
					onChange={handleInputChange}
					disabled={disabled || uploadState === "uploading"}
					className="sr-only"
					aria-label="Upload image"
				/>

				{displayImage ? (
					<div className="relative w-full">
						<img
							src={displayImage}
							alt="Uploaded preview"
							className="mx-auto max-h-48 rounded-md object-contain"
						/>
						{uploadState === "uploading" && (
							<div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/80">
								<Loader2 className="size-8 animate-spin text-primary" />
							</div>
						)}
						{isInteractive && !uploadState && value && (
							<Button
								type="button"
								variant="destructive"
								size="icon-sm"
								className="absolute right-2 top-2"
								onClick={handleRemove}
							>
								<X className="size-4" />
								<span className="sr-only">Remove image</span>
							</Button>
						)}
					</div>
				) : uploadState === "uploading" ? (
					<div className="flex flex-col items-center gap-2 p-6">
						<Loader2 className="size-8 animate-spin text-muted-foreground" />
						<p className="text-sm text-muted-foreground">Uploading...</p>
					</div>
				) : (
					<div className="flex flex-col items-center gap-2 p-6 text-center">
						<Upload className="size-8 text-muted-foreground" />
						<div className="text-sm">
							<span className="font-medium text-primary">Click to upload</span>
							<span className="text-muted-foreground"> or drag and drop</span>
						</div>
						<p className="text-xs text-muted-foreground">
							JPEG, PNG, WebP, or GIF (max {MAX_FILE_SIZE_MB}MB)
						</p>
					</div>
				)}
			</div>

			{error && (
				<div className="flex items-center gap-2 text-sm text-destructive">
					<AlertCircle className="size-4 shrink-0" />
					<span>{error}</span>
				</div>
			)}
		</div>
	);
}
