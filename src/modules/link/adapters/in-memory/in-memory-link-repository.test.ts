import { describeLinkRepositoryContract } from "../../../../../test/contracts/link-repository.contract.ts";
import { InMemoryLinkRepository } from "./in-memory-link-repository.ts";

describeLinkRepositoryContract("InMemoryLinkRepository", () => new InMemoryLinkRepository());
