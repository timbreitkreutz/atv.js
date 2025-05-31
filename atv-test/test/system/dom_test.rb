require "application_system_test_case"

class DomTest < ApplicationSystemTestCase
  test "adding a target" do
    skip "for now"
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
    skip "for now"
    visit atv_by_example_path
    assert_not page.has_text?("STATE IS DISCONNECTED Connected 1")
    assert page.has_css?("#simple-controller")

    js = <<~JS
      document.querySelector(".connect-button-2").remove();
    JS
    result = page.evaluate_script(js)
    assert page.has_text?("STATE IS DISCONNECTED Connected 1")
  end

  test "adding and removing multiples" do
    skip "for now"
    visit atv_by_example_path

    page.evaluate_script <<~JS
      (function() {
        const controller = document.getElementById("connect2");
        controller.insertAdjacentHTML("beforeend", '<div id="mm5" class="multi"><div data-atv-connecting-target="multi">M5</div></div>');
        controller.insertAdjacentHTML("beforeend", '<div id="mm6" class="multi" data-atv-connecting-target="multi">M6</div>');
      })();
    JS

    js = <<~JS
      (function() {
        document.querySelector(".multi")?.remove();
      })();
    JS
    6.downto(1).each do |ii|
      result = page.evaluate_script(js)
      assert page.has_text?("Count Is: #{ii}")
    end
  end
end
