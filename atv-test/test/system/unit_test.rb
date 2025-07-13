require "application_system_test_case"

class UnitTest < ApplicationSystemTestCase
  VERSION = "ATV v0.2.3"

  test "dasherize" do
    visit unit_test_path

    tests = {
      "" => "",
      "abc" => "abc",
      "abc_def" => "abc-def",
      "abc-def" => "abc-def",
      "abc_def_ghi" => "abc-def-ghi",
      "abc-def-ghi" => "abc-def-ghi",
      "AbcDef" => "AbcDef",
      "abcDef" => "abcDef"
    }

    assert page.has_text?(VERSION)

    tests.each do |input, output|
      assert_equal output, page.evaluate_script(%[window.dasherize("#{input}");]), "#{input} => #{output}"
    end
  end

  test "all variants" do
    visit unit_test_path

    tests = {
      [ "one-two-three" ] => [ "one-two-three", "one-two-threes", "one-two_three",
        "one-two_threes", "one_two-three", "one_two-threes",
        "one_two_three", "one_two_threes" ],
      [ "one-two" ] => [ "one-two", "one-twos", "one_two", "one_twos" ],
      [ "one" ] => [ "one", "ones" ],
      [ "" ] => []
    }

    assert page.has_text?(VERSION)

    tests.each do |input, output|
      # puts "in: #{input}"
      # puts "out: #{output}"
      script = %[window.allVariants("#{input.join('","')}");]
      # puts "script: #{script}"
      results = page.evaluate_script(script)
      # puts "result: #{results}"
      assert_equal output.sort, results.sort, "#{input} => #{output}"
    end
  end

  test "actionSequence" do
    visit unit_test_path
    assert page.has_text?(VERSION)

    # <div id="action1" data-atv-blah-blah-action="click">action1</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action1'))")

    assert_equal [ { "controllerName"=>"blah-blah", "eventName"=>"click", "method"=>"click", "parameters"=>[] } ], result

    # <div id="action2" data-atv-blah-blah-action="click=>clack">action2</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action2'))")
    assert_equal [ { "controllerName"=>"blah-blah", "eventName"=>"click", "method"=>"clack", "parameters"=>[] } ], result

    # <div id="action2a" data-atv-blah-blah-action="click=>clack">action2a</div>
    # result2 = page.evaluate_script("actionSequence('atv', document.getElementById('action2a'))")
    # puts "actionSequence('atv', document.getElementById('action2a'))"
    # assert_equal result, result2

    # <div id="action3" data-atv-blah-blah-action="click->clack">action3</div>
    result2 = page.evaluate_script("actionSequence('atv', document.getElementById('action3'))")
    assert_equal result, result2

    # <div id="action4" data-atv-blah-blah-action="click=>how#clack">action4</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action4'))")
    assert_equal [ { "controllerName"=>"how", "eventName"=>"click", "method"=>"clack", "parameters"=>[] } ], result

    # <div id="action5" data-atv-action="click=>blah-blah-blah#clack">action5</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action5'))")
    assert_equal [ { "controllerName"=>"blah-blah-blah", "eventName"=>"click", "method"=>"clack", "parameters"=>[] } ], result

    # <div id="action6" data-atv-another-action="click, clack">action6</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action6'))")
    assert_equal [ { "controllerName"=>"another", "eventName"=>"click", "method"=>"click", "parameters"=>[] },
    { "controllerName"=>"another", "eventName"=>"clack", "method"=>"clack", "parameters"=>[] } ], result

    # <div id="action7" data-atv-another-action="click, click=>clock">action7</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action7'))")
    assert_equal [ { "controllerName"=>"another", "eventName"=>"click", "method"=>"click", "parameters"=>[] },
    { "controllerName"=>"another", "eventName"=>"click", "method"=>"clock", "parameters"=>[] } ], result

    # <div id="action8" data-atv-another-actions="click, click=>clock">action8</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action8'))")
    assert_equal [ { "controllerName"=>"another", "eventName"=>"click", "method"=>"click", "parameters"=>[] },
    { "controllerName"=>"another", "eventName"=>"click", "method"=>"clock", "parameters"=>[] } ], result

    # <div id="action9" data-atv-actions="click=>hammer, click=>nail">action9</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action9'))")
    assert_equal [ { "controllerName"=>"hammer", "eventName"=>"click", "method"=>"click", "parameters"=>[] },
    { "controllerName"=>"nail", "eventName"=>"click", "method"=>"click", "parameters"=>[] } ], result

    # <div id="action9a" data_atv_actions="click=>hammer, click=>nail-b">action9a</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action9a'))")

    # assert_equal [ { "controllerName"=>"hammer", "eventName"=>"click", "method"=>"click", "parameters"=>[] },
    #   { "controllerName"=>"nail-b", "eventName"=>"click", "method"=>"click", "parameters"=>[] } ], result

    # <div id="action9b" data_atv_actions="click=>hammer, click->nail_b">action9b</div>
    result2 = page.evaluate_script("actionSequence('atv', document.getElementById('action9b'))")
    assert_equal result, result2

    # <div id="action10" data-atv-actions="click=>start#hammer, hover->what#ever, click=>finish#nail">action10</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action10'))")
    assert_equal [ { "controllerName"=>"start", "eventName"=>"click", "method"=>"hammer", "parameters"=>[] },
     { "controllerName"=>"what", "eventName"=>"hover", "method"=>"ever", "parameters"=>[] },
      { "controllerName"=>"finish", "eventName"=>"click", "method"=>"nail", "parameters"=>[] } ], result

    # <div id="action11" data-atv-blah-blah-action="click->click(a)">action11</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action11'))")
    # sleep 10000
    assert_equal [ { "controllerName"=>"blah-blah", "eventName"=>"click", "method"=>"click", "parameters"=>[ "a" ] } ], result

    # <div id="action12" data-atv_blah-blah-action="click(a)">action12</div>
    result2 = page.evaluate_script("actionSequence('atv', document.getElementById('action12'))")
    # sleep 100000000
    assert_equal result, result2

    # <div id="action13" data-atv-blah-blah-action="click(a, b)">action13</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action13'))")
    assert_equal [ { "controllerName"=>"blah-blah", "eventName"=>"click", "method"=>"click", "parameters"=>[ "a", "b" ] } ], result

    # <div id="action13a" data-atv-blah-blah-action='click("a", "b")'>action13a</div>
    result2 = page.evaluate_script("actionSequence('atv', document.getElementById('action13a'))")
    assert_equal result, result2

    # <div id="action14" data-atv-blah-blah-action="click->clock(a, b)">action14</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action14'))")
    assert_equal [ { "controllerName"=>"blah-blah", "eventName"=>"click", "method"=>"clock", "parameters"=>[ "a", "b" ] } ], result

    # <div id="action15" data-atv-blah-blah-action="click->clock(a, b), hover">action15</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action15'))")
    assert_equal [ { "controllerName"=>"blah-blah", "eventName"=>"click", "method"=>"clock", "parameters"=>[ "a", "b" ] },
    { "controllerName"=>"blah-blah", "eventName"=>"hover", "method"=>"hover", "parameters"=>[] } ], result

    # <div id="action16" data-atv-blah-blah-action="click->clock(a, b), click=>another#clicker">action16</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action16'))")
    assert_equal [ { "controllerName"=>"blah-blah", "eventName"=>"click", "method"=>"clock", "parameters"=>[ "a", "b" ] },
    { "controllerName"=>"another", "eventName"=>"click", "method"=>"clicker", "parameters"=>[] } ], result

    # ERB
    #  <%= tag.div id:"action17", data: {
    #   atv_blah_controller_actions: [
    #     "click=>clock(a, b)",
    #     "click=>another#clicker(d)"
    #   ]
    # } do %>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action17'))")
    assert_equal [ { "controllerName"=>"blah-controller", "eventName"=>"click", "method"=>"clock", "parameters"=>[ "a", "b" ] },
     { "controllerName"=>"another", "eventName"=>"click", "method"=>"clicker", "parameters"=>[ "d" ] } ], result

    # ERB
    # <%= tag.div id:"action18", data: {
    #   atv_actions: [
    #     "click=>one#clock(a, b)",
    #     "click=>another#clicker(d)"
    #   ]
    # } do %>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action18'))")
    assert_equal [ { "controllerName"=>"one", "eventName"=>"click", "method"=>"clock", "parameters"=>[ "a", "b" ] },
    { "controllerName"=>"another", "eventName"=>"click", "method"=>"clicker", "parameters"=>[ "d" ] } ], result

    # Prefixes

    # <div id="action19" data-blah-blah-action="click">action19</div>
    result = page.evaluate_script("actionSequence('', document.getElementById('action19'))")
    assert_equal [ { "controllerName"=>"blah-blah", "eventName"=>"click", "method"=>"click", "parameters"=>[] } ], result

    # <div id="action20" data-my-atv-blah-blah-action="click(22, 55)">action20</div>
    result = page.evaluate_script("actionSequence('my-atv', document.getElementById('action20'))")
    assert_equal [ { "controllerName"=>"blah-blah", "eventName"=>"click", "method"=>"click", "parameters"=>[ 22, 55 ] } ], result

    # Multiple declarations

    # <div id="action21" data-atv-blah-blah-action="click(22, 55)" data-atv-blah-action="clack->click" data-atv-action="focus->this#that">action21</div>
    result = page.evaluate_script("actionSequence('atv', document.getElementById('action21'))")
    assert_equal [ { "controllerName"=>"blah-blah", "eventName"=>"click", "method"=>"click", "parameters"=>[ 22, 55 ] },
    { "controllerName"=>"blah", "eventName"=>"clack", "method"=>"click", "parameters"=>[] },
     { "controllerName"=>"this", "eventName"=>"focus", "method"=>"that", "parameters"=>[] } ], result
  end
end
