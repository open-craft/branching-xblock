Branching Scenario XBlock
#########################

The Branching Scenario XBlock provides interactive, decision-based learning experiences for Open edX courses. It allows course authors to create choose-your-own-adventure style scenarios where learners navigate through content by making choices that lead to different outcomes.

Features
********

* **Interactive Decision Trees**: Create multi-path scenarios with branching narratives
* **Rich Media Support**: Include images, videos, and formatted text in scenarios
* **Choice Feedback**: Provide immediate feedback and hints for each decision point
* **Undo Functionality**: Allow learners to backtrack through their choices (optional)
* **Scoring Integration**: Award points for completed scenarios (optional)
* **Completion Tracking**: Monitor learner progress through the scenario
* **Studio Editor**: Visual editor for creating and managing branching scenarios
* **Internationalization**: Support for multiple languages

Installation
************

Install the XBlock within your Open EdX instance:

.. code-block:: bash

    git clone https://github.com/open-craft/branching-xblock.git
    cd branching-xblock
    pip install -e .


Then add it to your advanced component list in Studio:

.. code-block:: python

    ADVANCED_COMPONENT_TYPES = [
        # ... other components
        'branching_xblock',
    ]

Usage
*****

Adding to a Course
==================

1. In Studio, navigate to the unit where you want to add the branching scenario
2. Click "Add New Component" → "Advanced" → "Branching Scenario"
3. Click "Edit" to open the scenario editor

Creating a Scenario
===================

The scenario editor allows you to:

1. **Add Nodes**: Create content blocks with text, images, or videos
2. **Create Choices**: Add decision points that link to other nodes
3. **Configure Settings**:
   * Enable/disable undo functionality
   * Enable/disable scoring
   * Set maximum score value
   * Enable/disable hints

4. **Preview**: Test your scenario before publishing


Testing with Docker
*******************

This XBlock comes with a Docker test environment ready to build, based on the xblock-sdk workbench.
To build and run it:

.. code-block:: bash

    make dev.run

The XBlock SDK Workbench, including this XBlock, will be available on the list of XBlocks at http://localhost:8000

Site-config authoring help
**************************

Admins can optionally provide a help/instructions HTML snippet shown to authors in the Studio editor (as a collapsible help block in the settings panel).

- Configure this in Django SiteConfiguration ``site_values`` under the key ``branching_xblock``:

  .. code-block:: json

      {
        "branching_xblock": {
          "AUTHORING_HELP_HTML": "<p>You can use basic HTML in node content…</p>"
        }
      }

- This value is sanitized server-side (via ``bleach`` when available). Allowed tags:
  ``p``, ``br``, ``strong``, ``b``, ``em``, ``u``, ``code``, ``h3``, ``h4``, ``h5``, ``h6``, ``hr``, ``ul``, ``ol``, ``li``, ``a``.
  Allowed attributes: links permit ``href``, ``title``, ``target``, ``rel``.

Translating
***********

Internationalization (i18n) is when a program is made aware of multiple languages.
Localization (l10n) is adapting a program to local language and cultural habits.

Use the locale directory to provide internationalized strings for your XBlock project.
For more information on how to enable translations, visit the
`Enabling Translations on a New Repo <https://docs.openedx.org/en/latest/developers/how-tos/enable-translations-new-repo.html>`_.

This cookiecutter template uses `django-statici18n <https://django-statici18n.readthedocs.io/>`_
to provide translations to static javascript using ``gettext``.

The included Makefile contains targets for extracting, compiling and validating translatable strings.
The general steps to provide multilingual messages for a Python program (or an XBlock) are:

1. Mark translatable strings.
2. Run i18n tools to create raw message catalogs.
3. Create language specific translations for each message in the catalogs.
4. Use ``gettext`` to translate strings.

1. Mark translatable strings
============================

Mark translatable strings in python:

.. code-block:: python

    from django.utils.translation import ugettext as _

    # Translators: This comment will appear in the `.po` file.
    message = _("This will be marked.")

See `edx-developer-guide <https://docs.openedx.org/en/latest/developers/references/developer_guide/internationalization/i18n.html#python-source-code>`__
for more information.

You can also use ``gettext`` to mark strings in javascript:

.. code-block:: javascript

    // Translators: This comment will appear in the `.po` file.
    var message = gettext("Custom message.");

See `edx-developer-guide <https://docs.openedx.org/en/latest/developers/references/developer_guide/internationalization/i18n.html#javascript-files>`__
for more information.

2. Run i18n tools to create Raw message catalogs
================================================

This cookiecutter template offers multiple make targets which are shortcuts to
use `edx-i18n-tools <https://github.com/openedx/i18n-tools>`_.

After marking strings as translatable we have to create the raw message catalogs.
These catalogs are created in ``.po`` files. For more information see
`GNU PO file documentation <https://www.gnu.org/software/gettext/manual/html_node/PO-Files.html>`_.
These catalogs can be created by running:

.. code-block:: bash

    make extract_translations

The previous command will create the necessary ``.po`` files under
``branching-xblock/branching_xblock/conf/locale/en/LC_MESSAGES/text.po``.
The ``text.po`` file is created from the ``django-partial.po`` file created by
``django-admin makemessages`` (`makemessages documentation <https://docs.djangoproject.com/en/3.2/topics/i18n/translation/#message-files>`_),
this is why you will not see a ``django-partial.po`` file.

3. Create language specific translations
========================================

3.1 Add translated strings
--------------------------

After creating the raw message catalogs, all translations should be filled out by the translator.
One or more translators must edit the entries created in the message catalog, i.e. the ``.po`` file(s).
The format of each entry is as follows::

    #  translator-comments
    A. extracted-comments
    #: reference…
    #, flag…
    #| msgid previous-untranslated-string
    msgid 'untranslated message'
    msgstr 'mensaje traducido (translated message)'

For more information see
`GNU PO file documentation <https://www.gnu.org/software/gettext/manual/html_node/PO-Files.html>`_.

To use translations from transifex use the follow Make target to pull translations::

    $ make pull_translations

See `config instructions <https://github.com/openedx/i18n-tools#transifex-commands>`_ for information on how to set up your
transifex credentials.

See `Enabling Translations on a New Repo <https://docs.openedx.org/en/latest/developers/how-tos/enable-translations-new-repo.html>`_
for more details about integrating django with transifex.

3.2 Compile translations
------------------------

Once translations are in place, use the following Make target to compile the translation catalogs ``.po`` into
``.mo`` message files:

.. code-block:: bash

    make compile_translations

The previous command will compile ``.po`` files using
``django-admin compilemessages`` (`compilemessages documentation <https://docs.djangoproject.com/en/3.2/topics/i18n/translation/#compiling-message-files>`_).
After compiling the ``.po`` file(s), ``django-statici18n`` is used to create language specific catalogs. See
``django-statici18n`` `documentation <https://django-statici18n.readthedocs.io/en/latest/>`_ for more information.

 **Note:** The ``dev.run`` make target will automatically compile any translations.

 **Note:** To check if the source translation files (``.po``) are up-to-date run:

.. code-block:: bash

    make detect_changed_source_translations

4. Use ``gettext`` to translate strings
=======================================

Django will automatically use ``gettext`` and the compiled translations to translate strings.

Troubleshooting
***************

If there are any errors compiling ``.po`` files run the following command to validate your ``.po`` files:

.. code-block:: bash

    make validate

See `django's i18n troubleshooting documentation
<https://docs.djangoproject.com/en/3.2/topics/i18n/translation/#troubleshooting-gettext-incorrectly-detects-python-format-in-strings-with-percent-signs>`_
for more information.
