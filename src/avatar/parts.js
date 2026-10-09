// What the avatar builder can choose from. The picture files live in public/avatar-parts/
// (made by scripts/make-avatar-parts.py); the counts here must match them
// (scripts/check-avatar-parts.mjs checks that).

export const COUNTS = {
  face: 4, ears: 3, nose: 5, mouth: 6, eyes: 6, brows: 5,
  hair: 14, beard: 5, cloth: 8, acc: 6,
};

// Hair styles that have no back / front piece (bald has neither).
export const HAIR_BACK = [2, 4, 5, 7, 8, 9];
export const HAIR_FRONT = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13];

export const SKIN = ["#FDE0C8", "#F5C9A0", "#E3A877", "#C68642", "#A0693B", "#7A4A2A", "#5A3320", "#3E2318"];
export const HAIR = ["#1B1512", "#3B2619", "#6B4226", "#A56B35", "#D9A441", "#E9D28A", "#B5472E", "#8A8A8A", "#E5E5E5", "#2F4F9E", "#7B3FA0", "#D4558C"];
export const EYES = ["#3B2A1E", "#6B4226", "#3E7C4F", "#3A6FB0", "#6E7B8B", "#8A5A9E"];
export const LIPS = ["#B5646A", "#9C4A4F", "#D98A8A", "#7A3B3F", "#C8707A", "#A65A48"];
export const CLOTH = ["#2F4F9E", "#B5472E", "#3E7C4F", "#7B3FA0", "#D9A441", "#1B1512", "#E5E5E5", "#D4558C", "#2A8C8C", "#8A5A2B"];
export const BG = ["#E8F0FE", "#FDE8E8", "#E6F4EA", "#FFF4D6", "#EFE6FA", "#E0F2F1", "#FCE4EC", "#ECEFF1"];

// The picker's field list: key in the avatar, label, and how it is chosen.
export const FIELDS = {
  face: "Face shape", ears: "Ears", nose: "Nose", mouth: "Mouth", eyes: "Eyes",
  brows: "Eyebrows", hair: "Hair style", beard: "Facial hair", cloth: "Clothes", acc: "Extras",
};
