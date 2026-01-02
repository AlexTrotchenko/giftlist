import * as m from "@/paraglide/messages";

/**
 * Message keys used in Zod validation schemas.
 * These are stored in schemas as string keys and resolved at render time.
 * This allows validation to work on server without locale context,
 * while errors are translated when displayed in the UI.
 */
export const ValidationMessageKeys = {
	// Common
	nameRequired: "validation_nameRequired",
	nameTooLong: "validation_nameTooLong",

	// URL
	invalidUrl: "validation_invalidUrl",
	invalidImageUrl: "validation_invalidImageUrl",

	// Price
	priceMustBeInteger: "validation_priceMustBeInteger",
	priceCannotBeNegative: "validation_priceCannotBeNegative",
	invalidPriceFormat: "validation_invalidPriceFormat",

	// Notes/Description
	notesTooLong: "validation_notesTooLong",
	descriptionTooLong: "validation_descriptionTooLong",

	// Email
	invalidEmail: "validation_invalidEmail",

	// IDs
	itemIdRequired: "validation_itemIdRequired",
	groupIdRequired: "validation_groupIdRequired",
	atLeastOneGroupRequired: "validation_atLeastOneGroupRequired",

	// Amount/Claims
	amountMustBeInteger: "validation_amountMustBeInteger",
	amountMustBePositive: "validation_amountMustBePositive",
	pleaseEnterValidAmount: "validation_pleaseEnterValidAmount",
	amountExceedsRemaining: "validation_amountExceedsRemaining",

	// File upload
	fileMustBeImage: "validation_fileMustBeImage",
	fileTooLarge: "validation_fileTooLarge",
} as const;

export type ValidationMessageKey =
	(typeof ValidationMessageKeys)[keyof typeof ValidationMessageKeys];

/**
 * Map of message keys to their Paraglide message functions.
 * Used by resolveValidationMessage to look up translations.
 */
const messageResolvers: Record<
	ValidationMessageKey,
	((params?: Record<string, unknown>) => string) | undefined
> = {
	validation_nameRequired: m.validation_nameRequired,
	validation_nameTooLong: m.validation_nameTooLong,
	validation_invalidUrl: m.validation_invalidUrl,
	validation_invalidImageUrl: m.validation_invalidImageUrl,
	validation_priceMustBeInteger: m.validation_priceMustBeInteger,
	validation_priceCannotBeNegative: m.validation_priceCannotBeNegative,
	validation_invalidPriceFormat: m.validation_invalidPriceFormat,
	validation_notesTooLong: m.validation_notesTooLong,
	validation_descriptionTooLong: m.validation_descriptionTooLong,
	validation_invalidEmail: m.validation_invalidEmail,
	validation_itemIdRequired: m.validation_itemIdRequired,
	validation_groupIdRequired: m.validation_groupIdRequired,
	validation_atLeastOneGroupRequired: m.validation_atLeastOneGroupRequired,
	validation_amountMustBeInteger: m.validation_amountMustBeInteger,
	validation_amountMustBePositive: m.validation_amountMustBePositive,
	validation_pleaseEnterValidAmount: m.validation_pleaseEnterValidAmount,
	validation_amountExceedsRemaining: m.validation_amountExceedsRemaining,
	validation_fileMustBeImage: m.validation_fileMustBeImage,
	validation_fileTooLarge: m.validation_fileTooLarge,
};

/**
 * Check if a string is a validation message key.
 */
export function isValidationMessageKey(
	message: string,
): message is ValidationMessageKey {
	return message.startsWith("validation_") && message in messageResolvers;
}

/**
 * Resolve a validation message key to a translated string.
 * If the message is not a known key, returns it as-is (fallback for non-i18n messages).
 *
 * @param message - Either a message key (e.g., "validation_nameRequired") or a literal string
 * @param params - Optional parameters for parameterized messages
 * @returns The translated message string
 */
export function resolveValidationMessage(
	message: string,
	params?: Record<string, unknown>,
): string {
	if (isValidationMessageKey(message)) {
		const resolver = messageResolvers[message];
		if (resolver) {
			return resolver(params);
		}
	}
	// Return as-is if not a message key (fallback)
	return message;
}
