var Template = function (content, assignments) {
    this.init(content, assignments);
};


Template.prototype = {
    assignments : null,
    content     : null,
    parsed      : null,
    name        : null,

    /**
     * Create new template instance
     *
     * @param String content raw html
     * @param Object data holds keys and values for assignments
     */
    init: function (name, assignments)
    {
        this.assignments    = assignments;
        this.content        = $('#template-' + name).html() || '';
        this.name           = name;
    },


    /**
     * Evaluate statements
     * Replace variables by values
     */
    _parse: function ()
    {
        var result      = this.content,
            index       = null,
            regexp      = null,
            assignments = this.assignments,
            self        = this;

        // replace if/else
        regexp = new RegExp('{{if (.*)}}([\\s\\S]*?){{endif}}', 'gm');

        result = result.replace(regexp, function (match, condition, replace) {
            var regexp2                 = new RegExp('{{(if|elseif|else)(.*)}}([\\s\\S]*?){{(else|elseif|endif)', 'gm'),
                result                  = regexp2.exec(match),
                failsave                = 0,
                content                 = null;

            while (result && content === null && ++failsave < 100)
            {
                /*
                result[0] full match
                result[1] if/else/whatever
                result[2] condition
                result[3] content
                result[4] else/elseif/endif
                */

                var to_replace  = result[0].substr(0, result[0].length - (2 + result[4].length)),
                    is_success  = self._evaluate_if.call(self, result[2]);

                if (is_success)
                {
                    content = result[3];
                }
                match = match.replace(to_replace, '');
                result  = regexp2.exec(match);
            }
         
            if (content === null)
            {
                content = '';
            }

            return content;
        });


        // do for-loop
        regexp = new RegExp('{{for (.*)}}([\\s\\S]*?){{endfor}}', 'gm');
        result = result.replace(regexp, function (match, expression, statement) {
            return self._evaluate_for.call(self, expression, statement);
        });

        // do for-each
        regexp = new RegExp('{{foreach (.*)}}([\\s\\S]*?){{endforeach}}', 'gm');
        result = result.replace(regexp, function (match, list, item, statement) {
            return self._evaluate_foreach.call(self, list, item, statement);
        });

        // replace variables by values
        this.parsed = this._assign_values(result, this.assignments);
    },


    /**
     * Return result of parsed template
     */
    result: function ()
    {
        if (!this.parsed)
        {
            this._parse();
        }

        return this.parsed;
    },


    _assign_values: function(data, assignments)
    {
        var index   = null,
            regexp  = null,
            escaped = null,
            value   = null;

        for (index in assignments)
        {
            if (assignments.hasOwnProperty(index))
            {
                value   = assignments[index];

                if (value === undefined)
                {
                    value = '';
                }

                if (typeof value !== 'object')
                {
                    try {
                        escaped = $('<div></div>').text(value).html();
                    }
                    catch (e)
                    {
                        escaped = '';
                    }

                    regexpEscaped   = new RegExp('{{' + index + '}}', 'g');
                    regexpRaw       = new RegExp('{{raw::' + index + '}}', 'g');

                    data    = data
                                .replace(regexpEscaped, escaped)
                                .replace(regexpRaw, value);
                }
            }
        }

        return data;
    },


    _evaluate_if: function (condition) {
        condition = condition.replace(/\{/g, '').replace(/\}/g, '');

        if (!condition) {
            return true;
        }

        return new Function("raw", "" +
            "var index, data = {};" +
            "for(index in raw) if (raw.hasOwnProperty(index))" + " data[(index.replace(/-/g, '_'))] = raw[index];" +
            "with (data) {" +
                "try {" +
                    "return (" + condition + ");" +
                "} catch (e) {" +
                    "return false" +
                "}" +
            "}"
        )(this.assignments);
    },

    _evaluate_for: function (expression, statement) {
        var functionBody    = '',
            variableString  = '',
            replacements    = '';


        statement       = statement.replace(/\n/g, "");
        expression      = this._assign_values(expression, this.assignments);
        variableString  = new RegExp('(.+);.+;.+', 'g').exec(expression)[1];

        $.each(variableString.match(new RegExp('(([a-z0-9])+\\s?=)', 'g')), function (index, element) {
            var variable = $.trim(element.replace('=', ''));
            replacements += ".replace(/{{" + variable + "}}/g, " + variable + ")";
        });

        functionBody = "var index, data = {}, html = '';" +
                "for(index in raw) if (raw.hasOwnProperty(index))" + " data[(index.replace(/-/g, '_'))] = raw[index];" +
                "with (data) {" +
                    "for (" + expression + ") {" +
                        "html += ('" + statement + "')" + replacements + ";" +
                    "}" +
                "}" +
                "return html;";

        return new Function("raw", functionBody)(this.assignments);
    },

    _evaluate_foreach: function (list, statement) {
        var assignments = this.assignments,
            result      = '',
            index;


        statement   = statement.replace(/\n/g, '');
        list        = assignments.hasOwnProperty(list) ? assignments[list] : {};

        for (index in list)
        {
            result += this._assign_values(statement, list[index]);
        }

        return result;
    }
};