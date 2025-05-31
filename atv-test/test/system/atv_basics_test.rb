require "application_system_test_case"

class AtvBasicsTest < ApplicationSystemTestCase
  test "counters are independent" do
    visit atv_by_example_path

    aCount = page.find("#aCount")
    assert aCount.has_text? "Count 0"
    aCount.click
    sleep 0.25
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

    nCount = page.find("#nCount")
    assert nCount.has_text? "Count 0"
    4.times { nCount.click }
    assert nCount.has_text? "Count 4"
    assert cCount.has_text? "Count 1"
    assert bCount.has_text? "Count 1"
    assert mCount.has_text? "Count 3"
    assert aCount.has_text? "Count 1"

    bCount.click
    assert bCount.has_text? "Count 2"
    bCount.click
    assert bCount.has_text? "Count 3"
    bCount.click
    assert aCount.has_text? "Count 1"
    assert bCount.has_text? "Count 4"
    assert cCount.has_text? "Count 1"
    assert mCount.has_text? "Count 3"
    assert nCount.has_text? "Count 4"

    mButton = find("#multi-button")
    assert mButton.has_text? "Count 0"
    mButton.click
    assert_equal "rgb(0, 0, 255)",  clean_color(mButton)
    assert mButton.has_text? "Count 1"

    eButtton = find("#e-count")
    assert eButtton.has_text? "Start"
    eButtton.click
    assert eButtton.has_text? "Count 2"
    eButtton.click
    assert eButtton.has_text? "Count 4"
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
    assert eButtton.has_text? "Count 4"

    3.times { aCount.click }
    assert aCount.has_text? "Count 4"
    assert bCount.has_text? "Count 4"
    assert cCount.has_text? "Count 1"
    assert eButtton.has_text? "Count 4"
    assert mButton.has_text? "Count 1"
    assert mCount.has_text? "Count 5"
    assert nCount.has_text? "Count 4"
  end

  test "greeting" do
    visit atv_by_example_path
    name = "Test User #{rand(100)}"
    find("#greet-input").set(name)
    find("#greet-button").click
    assert find("#greet-out").has_text?("Hello, #{name}!")
  end

  test "values and different naming styles" do
    visit atv_by_example_path
    output = find("#config-out1")
    assert_not output.has_text?("blue")
    find("#config-button1").click
    assert output.has_text?("blue")

    visit atv_by_example_path
    output = find("#config-out2")
    assert_not output.has_text?("yellow")
    find("#config-button2").click
    assert output.has_text?("yellow")

    visit atv_by_example_path
    output = find("#config-out3")
    assert_not output.has_text?("green")
    find("#config-button3").click
    assert output.has_text?("green")
  end

  test "targets" do
    visit atv_by_example_path
    output = find("span#multiply-out")
    assert_not output.has_text?("60")
    find("#multiply-button").click
    assert output.has_text?("60")

    output = find("span#multiply2-out")
    assert_not output.has_text?("2730")
    find("#multiply2-button").click
    assert output.has_text?("2730")
  end

  test "outlets" do
    visit atv_by_example_path
    output = find("#inter-out")
    assert_not output.has_text?("14")
    find("#inter-button").click
    assert output.has_text?("14")
  end

  test "events" do
    visit atv_by_example_path
    input = find("#name")
    input.native.send_keys("ab5533aa")
    assert_equal "abaa", input.value
  end

  test "sequence" do
    visit atv_by_example_path
    button = find("#f-button")
    extra = find("#multi-out")
    quotient = find("#quotient")
    result = find("#result")
    assert quotient.has_text?("0")
    assert result.has_text?("0")
    assert_not extra.has_text?("DONE")
    button.click
    assert quotient.has_text?("4")
    assert result.has_text?("24")
    fill_in "divisor", with: 0
    button.click
    assert quotient.has_text?("You can't divide by zero")
    assert result.has_text?("24")
    assert extra.has_text?("DONE")
  end

  test "adding elements" do
    visit atv_by_example_path

    aCount = page.find("#aCount")
    assert aCount.has_text? "Count 0"
    aCount.click
    sleep 0.25
    assert aCount.has_text? "Count 1"

    assert page.has_text?("Connected", count: 4)
    assert_not page.has_text?("Not yet connected")
    create_button = find(".connect-button")
    create_button.click
    assert_not page.has_text?("Not yet connected")
    assert page.has_text?("Connected", count: 5)
    create_button.click
    assert_not page.has_text?("Not yet connected")
    assert page.has_text?("Connected", count: 6)
    last_button = page.all(".connect-button").last
    last_button.click
    assert_not page.has_text?("Not yet connected")
    assert page.has_text?("Connected", count: 7)

    2.times { aCount.click }
    assert aCount.has_text? "Count 3"
  end

  test "removing elements" do
    visit atv_by_example_path

    aCount = page.find("#aCount")
    assert aCount.has_text? "Count 0"
    aCount.click
    sleep 0.25
    assert aCount.has_text? "Count 1"

    # Disconnect

    disconnect_button = find("#disconnect-button-2")
    assert page.has_text?("Disconnect", count: 2)
    assert_not page.has_text?("Disconnected")
    disconnect_button.click

    assert page.has_text?("Disconnect", count: 2)
    assert page.has_text?("Disconnected")
    input = find("#name")
    input.native.send_keys("ab5533aa")
    assert_equal "abaa", input.value

    disconnect_button = find("#disconnect-button-1")
    assert page.has_text?("Disconnect", count: 2)
    assert page.has_text?("Disconnected", count: 1)
    disconnect_button.click
    assert page.has_text?("Disconnect", count: 2)
    assert page.has_text?("Disconnected", count: 2)
    input = find("#name")
    input.native.send_keys("ab5533aa")
    assert_equal "abaaabaa", input.value

    aCount.click
    assert aCount.has_text? "Count 2"
  end
end
