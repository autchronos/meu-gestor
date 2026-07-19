import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

test("a home renderiza o nome da marca", () => {
  render(<Home />);
  expect(screen.getByText("Autchronos")).toBeInTheDocument();
});
