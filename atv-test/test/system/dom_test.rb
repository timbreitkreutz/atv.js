require "application_system_test_case"

class DomTest < ApplicationSystemTestCase
  test "adding a target" do
    visit atv_by_example_path
    assert page.has_text?("Added New Target", count: 1)
    assert page.has_css?("#simple-controller")

    js = <<~JS
      (function() {
        const controller = document.getElementById("simple-controller");
        controller.insertAdjacentHTML("beforeend", '<div data-atv-simple-target="here, new">XXX</div>');
      })();
    JS
    result = page.evaluate_script(js)
    assert page.has_text?("Added New Target", count:2)
  end

  test "removing a target" do
    visit atv_by_example_path
    assert_not page.has_text?("STATE IS DISCONNECTED Connected")
    assert page.has_css?("#simple-controller")
    js = <<~JS
      document.querySelector(".connect-button-2").remove();
    JS
    result = page.evaluate_script(js)
    assert page.has_text?("STATE IS DISCONNECTED Connected")
  end

  test "adding and removing multiples" do
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

    assert page.has_text?("Count Is: 6")
    page.evaluate_script(js)
    assert page.has_text?("Count Is: 5")
    page.evaluate_script(js)
    assert page.has_text?("Count Is: 4")
    page.evaluate_script(js)
    assert page.has_text?("Count Is: 3")
    page.evaluate_script(js)
    assert page.has_text?("Count Is: 2")
    page.evaluate_script(js)
    assert page.has_text?("Count Is: 1")
    page.evaluate_script(js)
    assert page.has_text?("Count Is: 0")
  end
end
