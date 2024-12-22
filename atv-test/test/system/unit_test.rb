require "application_system_test_case"

class UnitTest < ApplicationSystemTestCase
  VERSION = "ATV v0.1.8"

  test "pascalize" do
    visit unit_test_path

    tests = {
      "" => "",
      "abc" => "Abc",
      "abc_def" => "AbcDef",
      "abc-def" => "AbcDef",
      "abc_def_ghi" => "AbcDefGhi",
      "abc-def-ghi" => "AbcDefGhi",
      "abcDef" => "AbcDef",
      "AbcDef" => "AbcDef"
    }

    assert page.has_text?(VERSION)

    tests.each do |input, output|
      assert_equal output, page.evaluate_script(%[window.pascalize("#{input}");]), "#{input} => #{output}"
    end
  end

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
      [ "" ] => [],
      [ "one" ] => [ "one", "ones" ],
      [ "one-two" ] => [ "one-two", "one-twos", "one_two", "one_twos" ],
      [ "one", "three" ] => [ "one-three", "one-threes", "one_three", "one_threes" ],
      [ "one", "two", "three" ] => [ "one-two-three", "one-two-threes",
                                  "one-two_three", "one-two_threes",
                                  "one_two-three", "one_two-threes",
                                  "one_two_three", "one_two_threes" ],
      [ "one", "two-three", "four" ] => [ "one-two-three-four", "one-two-three-fours",
                                       "one-two-three_four", "one-two-three_fours",
                                       "one-two_three-four", "one-two_three-fours",
                                       "one-two_three_four", "one-two_three_fours",
                                       "one_two-three-four", "one_two-three-fours",
                                       "one_two-three_four", "one_two-three_fours",
                                       "one_two_three-four", "one_two_three-fours",
                                       "one_two_three_four", "one_two_three_fours" ].uniq,
      [ "one-two", "three_four" ] => [ "one-two-three-four", "one-two-three-fours",
                                    "one-two-three_four", "one-two-three_fours",
                                    "one-two_three-four", "one-two_three-fours",
                                    "one-two_three_four", "one-two_three_fours",
                                    "one_two-three-four", "one_two-three-fours",
                                    "one_two-three_four", "one_two-three_fours",
                                    "one_two_three-four", "one_two_three-fours",
                                    "one_two_three_four", "one_two_three_fours" ].uniq
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

  test "actionsFor" do
    visit unit_test_path
    assert page.has_text?(VERSION)

    # <div id="action1" data-atv-blah-blah-action="click">action1</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action1'))")
    assert_equal [ { "controller"=>"blah-blah", "event"=>"click", "method"=>"click", "parameters"=>[] } ], result

    # <div id="action2" data-atv-blah-blah-action="click=>clack">action2</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action2'))")
    assert_equal [ { "controller"=>"blah-blah", "event"=>"click", "method"=>"clack", "parameters"=>[] } ], result

    # <div id="action2a" data_atv_blah_blah_action="click=>clack">action2a</div>
    result2 = page.evaluate_script("actionsFor('atv', document.getElementById('action2a'))")
    assert_equal result, result2

    # <div id="action3" data-atv-blah-blah-action="click->clack">action3</div>
    result2 = page.evaluate_script("actionsFor('atv', document.getElementById('action3'))")
    assert_equal result2, result

    # <div id="action4" data-atv-blah-blah-action="click=>how#clack">action4</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action4'))")
    assert_equal [ { "controller"=>"how", "event"=>"click", "method"=>"clack", "parameters"=>[] } ], result

    # <div id="action5" data-atv-action="click=>blah-blah-blah#clack">action5</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action5'))")
    assert_equal [ { "controller"=>"blah-blah-blah", "event"=>"click", "method"=>"clack", "parameters"=>[] } ], result

    # <div id="action6" data-atv-another-action="click, clack">action6</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action6'))")
    assert_equal [ { "controller"=>"another", "event"=>"click", "method"=>"click", "parameters"=>[] },
    { "controller"=>"another", "event"=>"clack", "method"=>"clack", "parameters"=>[] } ], result

    # <div id="action7" data-atv-another-action="click, click=>clock">action7</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action7'))")
    assert_equal [ { "controller"=>"another", "event"=>"click", "method"=>"click", "parameters"=>[] },
    { "controller"=>"another", "event"=>"click", "method"=>"clock", "parameters"=>[] } ], result

    # <div id="action8" data-atv-another-actions="click, click=>clock">action8</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action8'))")
    assert_equal [ { "controller"=>"another", "event"=>"click", "method"=>"click", "parameters"=>[] },
    { "controller"=>"another", "event"=>"click", "method"=>"clock", "parameters"=>[] } ], result

    # <div id="action9" data-atv-actions="click=>hammer, click=>nail">action9</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action9'))")
    assert_equal [ { "controller"=>"hammer", "event"=>"click", "method"=>"click", "parameters"=>[] },
    { "controller"=>"nail", "event"=>"click", "method"=>"click", "parameters"=>[] } ], result

    # <div id="action9a" data_atv_actions="click=>hammer, click=>nail-b">action9a</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action9a'))")
    assert_equal [ { "controller"=>"hammer", "event"=>"click", "method"=>"click", "parameters"=>[] },
      { "controller"=>"nail-b", "event"=>"click", "method"=>"click", "parameters"=>[] } ], result

    # <div id="action9b" data_atv_actions="click=>hammer, click->nail_b">action9b</div>
    result2 = page.evaluate_script("actionsFor('atv', document.getElementById('action9b'))")
    assert_equal result, result2

    # <div id="action10" data-atv-actions="click=>start#hammer, hover->what#ever, click=>finish#nail">action10</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action10'))")
    assert_equal [ { "controller"=>"start", "event"=>"click", "method"=>"hammer", "parameters"=>[] },
     { "controller"=>"what", "event"=>"hover", "method"=>"ever", "parameters"=>[] },
      { "controller"=>"finish", "event"=>"click", "method"=>"nail", "parameters"=>[] } ], result

    # <div id="action11" data-atv-blah-blah-action="click->click(a)">action11</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action11'))")
    assert_equal [ { "controller"=>"blah-blah", "event"=>"click", "method"=>"click", "parameters"=>[ "a" ] } ], result

    # <div id="action12" data-atv_blah-blah-action="click(a)">action12</div>
    result2 = page.evaluate_script("actionsFor('atv', document.getElementById('action12'))")
    assert_equal result, result2

    # <div id="action13" data-atv-blah-blah-action="click(a, b)">action13</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action13'))")
    assert_equal [ { "controller"=>"blah-blah", "event"=>"click", "method"=>"click", "parameters"=>[ "a", "b" ] } ], result

    # <div id="action13a" data-atv-blah-blah-action='click("a", "b")'>action13a</div>
    result2 = page.evaluate_script("actionsFor('atv', document.getElementById('action13a'))")
    assert_equal result, result2

    # <div id="action14" data-atv-blah-blah-action="click->clock(a, b)">action14</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action14'))")
    assert_equal [ { "controller"=>"blah-blah", "event"=>"click", "method"=>"clock", "parameters"=>[ "a", "b" ] } ], result

    # <div id="action15" data-atv-blah-blah-action="click->clock(a, b), hover">action15</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action15'))")
    assert_equal [ { "controller"=>"blah-blah", "event"=>"click", "method"=>"clock", "parameters"=>[ "a", "b" ] },
    { "controller"=>"blah-blah", "event"=>"hover", "method"=>"hover", "parameters"=>[] } ], result

    # <div id="action16" data-atv-blah-blah-action="click->clock(a, b), click=>another#clicker">action16</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action16'))")
    assert_equal [ { "controller"=>"blah-blah", "event"=>"click", "method"=>"clock", "parameters"=>[ "a", "b" ] },
    { "controller"=>"another", "event"=>"click", "method"=>"clicker", "parameters"=>[] } ], result

    # ERB
    #  <%= tag.div id:"action17", data: {
    #   atv_blah_controller_actions: [
    #     "click=>clock(a, b)",
    #     "click=>another#clicker(d)"
    #   ]
    # } do %>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action17'))")
    assert_equal [ { "controller"=>"blah-controller", "event"=>"click", "method"=>"clock", "parameters"=>[ "a", "b" ] },
     { "controller"=>"another", "event"=>"click", "method"=>"clicker", "parameters"=>[ "d" ] } ], result

    # ERB
    # <%= tag.div id:"action18", data: {
    #   atv_actions: [
    #     "click=>one#clock(a, b)",
    #     "click=>another#clicker(d)"
    #   ]
    # } do %>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action18'))")
    assert_equal [ { "controller"=>"one", "event"=>"click", "method"=>"clock", "parameters"=>[ "a", "b" ] },
    { "controller"=>"another", "event"=>"click", "method"=>"clicker", "parameters"=>[ "d" ] } ], result

    # Prefixes

    # <div id="action19" data-blah-blah-action="click">action19</div>
    result = page.evaluate_script("actionsFor('', document.getElementById('action19'))")
    assert_equal [ { "controller"=>"blah-blah", "event"=>"click", "method"=>"click", "parameters"=>[] } ], result

    # <div id="action20" data-my-atv-blah-blah-action="click(22, 55)">action20</div>
    result = page.evaluate_script("actionsFor('my-atv', document.getElementById('action20'))")
    assert_equal [ { "controller"=>"blah-blah", "event"=>"click", "method"=>"click", "parameters"=>[ 22, 55 ] } ], result

    # Multiple declarations

    # <div id="action21" data-atv-blah-blah-action="click(22, 55)" data-atv-blah-action="clack->click" data-atv-action="focus->this#that">action21</div>
    result = page.evaluate_script("actionsFor('atv', document.getElementById('action21'))")
    assert_equal [ { "controller"=>"blah-blah", "event"=>"click", "method"=>"click", "parameters"=>[ 22, 55 ] },
    { "controller"=>"blah", "event"=>"clack", "method"=>"click", "parameters"=>[] },
     { "controller"=>"this", "event"=>"focus", "method"=>"that", "parameters"=>[] } ], result
  end
end
