import { serviceConfig } from "@/app/_config/service";
import { RankData, RegisterData } from "./types";

export const register = async (data: RegisterData) => {
  const response = await fetch(`${serviceConfig.baseUrl}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to register");
  }
};

export const rank = async () => {
  const response = await fetch(`${serviceConfig.baseUrl}/rank`);

  if (!response.ok) {
    throw new Error("Failed to get rank");
  }

  return response.json() as Promise<RankData>;
};
