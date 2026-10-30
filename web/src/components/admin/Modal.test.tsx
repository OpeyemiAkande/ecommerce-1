import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {Modal} from "./Modal";

describe("Modal", () => {
  it("renders a labelled dialog and closes on Escape", async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Add New Product" onClose={onClose}>
        <p>body</p>
      </Modal>
    );

    expect(
      screen.getByRole("dialog", {name: "Add New Product"})
    ).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close while closing is disabled", async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Saving" onClose={onClose} closeDisabled>
        <p>body</p>
      </Modal>
    );

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", {name: "Close"}));
    expect(onClose).not.toHaveBeenCalled();
  });
});
