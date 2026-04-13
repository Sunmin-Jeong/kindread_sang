import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";
import { getApiUrl } from "./query-client";

const MAX_DIMENSION = 1200;

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
}

export async function compressImage(uri: string): Promise<CompressedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

async function uriToBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    const FileSystem = await import("expo-file-system/legacy");
    return FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  }
}

export async function uploadImageToStorage(
  uri: string,
  bucket: "reflections" | "club-covers",
  userId: string
): Promise<string | null> {
  try {
    console.log(`Starting upload to ${bucket} for user ${userId}`);
    
    const compressed = await compressImage(uri);
    console.log("Image compressed:", compressed.uri);
    
    const base64 = await uriToBase64(compressed.uri);
    console.log("Image converted to base64, length:", base64.length);

    const apiUrl = getApiUrl();
    const uploadUrl = new URL("/api/upload", apiUrl);
    console.log("Uploading to:", uploadUrl.toString());
    
    const uploadResponse = await fetch(uploadUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucket,
        userId,
        imageBase64: base64,
        contentType: "image/jpeg",
      }),
    });

    console.log("Upload response status:", uploadResponse.status);

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      console.error(`Error uploading to ${bucket}:`, errorData);
      return null;
    }

    const data = await uploadResponse.json();
    console.log("Upload successful, publicUrl:", data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error(`Error in uploadImageToStorage (${bucket}):`, error);
    return null;
  }
}

export async function uploadMultipleImages(
  uris: string[],
  bucket: "reflections" | "club-covers",
  userId: string
): Promise<string[]> {
  const uploadPromises = uris.map((uri) =>
    uploadImageToStorage(uri, bucket, userId)
  );
  
  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
}
