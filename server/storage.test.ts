import { describe, it, expect, beforeEach } from "vitest";
import { MemStorage } from "./storage";

describe("MemStorage", () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  describe("createUser", () => {
    it("creates a user with generated id", async () => {
      const user = await storage.createUser({
        username: "hunter1",
        password: "secret",
      });
      expect(user.id).toBeTruthy();
      expect(user.username).toBe("hunter1");
      expect(user.password).toBe("secret");
    });

    it("assigns unique ids to different users", async () => {
      const user1 = await storage.createUser({ username: "a", password: "p" });
      const user2 = await storage.createUser({ username: "b", password: "p" });
      expect(user1.id).not.toBe(user2.id);
    });
  });

  describe("getUser", () => {
    it("returns the user by id", async () => {
      const created = await storage.createUser({
        username: "hunter1",
        password: "secret",
      });
      const found = await storage.getUser(created.id);
      expect(found).toEqual(created);
    });

    it("returns undefined for non-existent id", async () => {
      const found = await storage.getUser("nonexistent");
      expect(found).toBeUndefined();
    });
  });

  describe("getUserByUsername", () => {
    it("returns the user by username", async () => {
      const created = await storage.createUser({
        username: "hunter1",
        password: "secret",
      });
      const found = await storage.getUserByUsername("hunter1");
      expect(found).toEqual(created);
    });

    it("returns undefined for non-existent username", async () => {
      const found = await storage.getUserByUsername("nobody");
      expect(found).toBeUndefined();
    });

    it("finds correct user among multiple", async () => {
      await storage.createUser({ username: "a", password: "p1" });
      const target = await storage.createUser({ username: "b", password: "p2" });
      await storage.createUser({ username: "c", password: "p3" });

      const found = await storage.getUserByUsername("b");
      expect(found).toEqual(target);
    });
  });
});
