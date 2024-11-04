require "application_system_test_case"

class AtvBasicsTest < ApplicationSystemTestCase
  test "counters are independent" do
    visit atv_by_example_path

    aCount = page.find("#aCount")
    assert aCount.has_text? "Count 0"
    aCount.click
    assert aCount.has_text? "Count 1"

    mCount = page.find("#mCount")
    assert mCount.has_text? "Count 0"
    mCount.click
    assert mCount.has_text? "Count 1"
    mCount.click
    mCount.click
    assert mCount.has_text? "Count 3"
    assert aCount.has_text? "Count 1"

    bCount = page.find("#bCount")
    assert bCount.has_text? "Count 0"
    bCount.click
    assert bCount.has_text? "Count 1"
    assert mCount.has_text? "Count 3"
    assert aCount.has_text? "Count 1"

    cCount = page.find("#cCount")
    assert cCount.has_text? "Count 0"
    cCount.click
    assert cCount.has_text? "Count 1"
    assert bCount.has_text? "Count 1"
    assert mCount.has_text? "Count 3"
    assert aCount.has_text? "Count 1"

    bCount.click
    assert bCount.has_text? "Count 2"
    bCount.click
    assert bCount.has_text? "Count 3"
    bCount.click
    assert bCount.has_text? "Count 4"
    assert cCount.has_text? "Count 1"
    assert mCount.has_text? "Count 3"
    assert aCount.has_text? "Count 1"

    mButton = find("#multi-button")
    assert mButton.has_text? "Count 0"
    mButton.click 
    assert mButton.matches_style?('background-color' => 'rgb(0, 0, 255)')
    assert mButton.has_text? "Count 1"

    assert bCount.has_text? "Count 4"
    assert cCount.has_text? "Count 1"
    assert mCount.has_text? "Count 3"
    assert aCount.has_text? "Count 1"

    mCount.click
    assert mCount.has_text? "Count 4"
    mCount.click
    assert mCount.has_text? "Count 5"
    assert bCount.has_text? "Count 4"
    assert cCount.has_text? "Count 1"
    assert aCount.has_text? "Count 1"
    assert mButton.has_text? "Count 1"

    3.times { aCount.click }
    assert aCount.has_text? "Count 4"
    assert mCount.has_text? "Count 5"
    assert bCount.has_text? "Count 4"
    assert cCount.has_text? "Count 1"
    assert mButton.has_text? "Count 1"
  end

  test "greeting" do 
    visit atv_by_example_path
    name = "Test User #{rand(100)}"
    find("#greet-input").set(name)
    find("#greet-button").click
    assert find("#greet-out").has_text?("Hello, #{name}!")
  end

  test "values" do 
    visit atv_by_example_path
    output = find("#config-out")
    assert !output.has_text?("favorite color")
    find("#config-button").click
    assert output.has_text?("favorite color")
  end

  test "targets" do 
    visit atv_by_example_path
    output = find("span#multiply-out")
    assert !output.has_text?("60")
    find("#multiply-button").click
    assert output.has_text?("60")
  end
end
