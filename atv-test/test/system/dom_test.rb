require "application_system_test_case"

class DomTest < ApplicationSystemTestCase
  test "adding a target" do
    visit atv_by_example_path
    assert_not page.has_text?("Added New Target")
    assert page.has_css?("#simple-controller")

    js = <<~JS
      (function() { 
        const controller = document.getElementById("simple-controller");
        controller.insertAdjacentHTML("beforeend", '<div data-atv-simple-target="here, new"></div>');
      })();
    JS
    result = page.evaluate_script(js)
    assert page.has_text?("Added New Target")
  end

  test "removing a target" do
    visit atv_by_example_path
    assert_not page.has_text?("STATE IS DISCONNECTED Connected 1")
    assert page.has_css?("#simple-controller")

    js = <<~JS
      (function() { 
        document.querySelector(".connect-button-2").remove();
      })();
    JS
    result = page.evaluate_script(js)
    assert page.has_text?("STATE IS DISCONNECTED Connected 1")
  end
end
