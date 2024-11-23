require "application_system_test_case"

class VariationsTest < ApplicationSystemTestCase
  test "counters are independent" do
    visit atv_variations_path

    page.all(".multi-button-1").each do |button|
      assert_equal "Count 0", button.text
      button.click
      assert_equal "Count 1", button.text
    end
    page.all(".multi-button-1").each do |button|
      assert_equal "Count 1", button.text
      button.click
      assert_equal "Count 2", button.text
    end

    page.all(".multi-button-2").each do |button|
      assert_equal "Count 0", button.text
      assert_equal "rgb(0, 128, 0)", button.style("background-color").values.first
      button.click
      assert_equal "Count 3", button.text
      assert_equal "rgb(0, 0, 255)", button.style("background-color").values.first
    end
    page.all(".multi-button-2").each do |button|
      assert_equal "Count 3", button.text
      assert_equal "rgb(0, 0, 255)", button.style("background-color").values.first
      button.click
      assert_equal "Count 4", button.text
      assert_equal "rgb(0, 128, 0)", button.style("background-color").values.first
    end

    page.all(".multi-button-3").each do |button|
      assert_equal "Count 0", button.text
      assert_equal "rgb(0, 128, 0)", button.style("background-color").values.first
      button.click
      binding.pry
      assert_equal "Count 5", button.text
      assert_equal "rgb(0, 0, 255)", button.style("background-color").values.first
    end

    page.all(".multi-button-3").each do |button|
      assert_equal "Count 5", button.text
      assert_equal "rgb(0, 0, 255)", button.style("background-color").values.first
      button.click
      assert_equal "Count 6", button.text
      assert_equal "rgb(0, 128, 0)", button.style("background-color").values.first
    end
  end
end